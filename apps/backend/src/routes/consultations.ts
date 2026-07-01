import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  ConsultationModel,
  UserModel,
  getNextSequence,
  toConsultation,
  toUserProfile,
  type ConsultationDoc,
} from "@workspace/db";
import { listExperts } from "../services/expert-list";
import { findPublicUserById, toPublicUserProfile } from "../lib/public-user";
import { hasConfiguredAvailability } from "../lib/mentorship-availability";
import { requireAuth } from "../middlewares/auth";
import { assertSlotAvailable, getConsultantSlotsMeta } from "../services/mentorship-slots";
import { assertCanBookWithMentor } from "../services/mentorship-booking-guard";
import { confirmConsultationPayment } from "../services/mentorship-payment";
import { creditMentorForSession, refundSessionPoints, releaseSessionReservation, sessionPointsCost } from "../services/mentorship-points";
import { raiseSessionDispute } from "../services/mentorship-dispute";
import { getUserPointsBalance } from "../services/pointsPurchase";
import { isMentorshipPaymentEnabled } from "../services/jitsi-meeting";
import { isAdminUser } from "../middlewares/admin";
import { jitsiMeetingDbFields, cleanupExpiredJitsiSessions, recordConsultationJoin } from "../services/jitsi-session";
import {
  notifyMentorshipBooking,
  notifyMentorshipSessionConfirmed,
} from "../services/notification-triggers";

const router: IRouter = Router();

const BookConsultationBody = z.object({
  consultantId: z.number().int().positive(),
  slotStartAt: z.string().datetime(),
  message: z.string().max(1000).optional(),
});

const DisputeBody = z.object({
  reason: z.string().min(20).max(2000),
});

const UpdateConsultationBody = z.object({
  status: z.enum(["cancelled", "completed", "rejected"]).optional(),
});

async function enrichConsultation(doc: ConsultationDoc) {
  const [requester, consultant] = await Promise.all([
    findPublicUserById(doc.requesterId),
    findPublicUserById(doc.consultantId),
  ]);
  return {
    ...toConsultation(doc),
    requester: toPublicUserProfile(requester),
    consultant: toPublicUserProfile(consultant),
  };
}

router.get("/consultations/video-config", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const balance = await getUserPointsBalance(user.id);
  res.json({
    provider: "jitsi",
    paymentEnabled: isMentorshipPaymentEnabled(),
    paymentMethod: "points" as const,
    pointsBalance: balance,
    isAdmin: await isAdminUser(user.id),
  });
});

router.get("/consultations/experts", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const pageRaw = typeof req.query.page === "string" ? req.query.page : "1";
  const limitRaw = typeof req.query.limit === "string" ? req.query.limit : "20";

  const result = await listExperts({
    excludeUserId: user.id,
    q: typeof req.query.q === "string" ? req.query.q.trim() : undefined,
    branch: typeof req.query.branch === "string" ? req.query.branch.trim() : undefined,
    company: typeof req.query.company === "string" ? req.query.company.trim() : undefined,
    college: typeof req.query.college === "string" ? req.query.college.trim() : undefined,
    graduationYear:
      typeof req.query.graduationYear === "string" ? req.query.graduationYear.trim() : undefined,
    category: typeof req.query.category === "string" ? req.query.category.trim() : undefined,
    experience: typeof req.query.experience === "string" ? req.query.experience.trim() : undefined,
    sessionLength:
      typeof req.query.sessionLength === "string" ? req.query.sessionLength.trim() : undefined,
    price: typeof req.query.price === "string" ? req.query.price.trim() : undefined,
    page: parseInt(pageRaw, 10),
    limit: parseInt(limitRaw, 10),
  });

  res.json({
    items: result.users.map((u) => toUserProfile(u)),
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasMore: result.hasMore,
  });
});

router.get("/consultations/experts/:consultantId/slots", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.consultantId)
    ? req.params.consultantId[0]
    : req.params.consultantId;
  const consultantId = parseInt(raw, 10);
  if (Number.isNaN(consultantId)) {
    res.status(400).json({ error: "Invalid consultant id" });
    return;
  }

  const from =
    typeof req.query.from === "string"
      ? req.query.from
      : new Date().toISOString();
  const to =
    typeof req.query.to === "string"
      ? req.query.to
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const slots = await getConsultantSlotsMeta(consultantId, from, to);
  res.json(slots);
});

router.get("/consultations", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const role = typeof req.query.role === "string" ? req.query.role : "all";

  void cleanupExpiredJitsiSessions();

  let filter: Record<string, unknown>;
  if (role === "requester") {
    filter = { requesterId: user.id };
  } else if (role === "consultant") {
    filter = { consultantId: user.id };
  } else {
    filter = { $or: [{ requesterId: user.id }, { consultantId: user.id }] };
  }

  const rows = await ConsultationModel.find(filter).sort({ scheduledAt: -1, createdAt: -1 }).lean();
  res.json(await Promise.all(rows.map(enrichConsultation)));
});

/** Book a slot — payment step follows unless free session */
router.post("/consultations/book", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number; fullName: string } }).currentUser;
  const parsed = BookConsultationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { consultantId, slotStartAt, message } = parsed.data;
  if (consultantId === user.id) {
    res.status(400).json({ error: "Cannot book a session with yourself" });
    return;
  }

  const consultant = await findPublicUserById(consultantId);
  if (!consultant?.isConsultant) {
    res.status(404).json({ error: "Mentor not found" });
    return;
  }

  if (!hasConfiguredAvailability(consultant.mentorshipWeeklyAvailability)) {
    res.status(400).json({
      error: "This mentor has not set their weekly availability yet. Ask them to update their profile.",
    });
    return;
  }

  const durationMinutes = consultant.mentorshipDurationMinutes ?? 30;
  const amountPoints = sessionPointsCost(consultant.mentorshipPriceInr ?? 0);

  try {
    await assertCanBookWithMentor(user.id, consultantId);
    await assertSlotAvailable(consultantId, slotStartAt, durationMinutes);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Slot unavailable" });
    return;
  }

  const when = new Date(slotStartAt);
  const end = new Date(when.getTime() + durationMinutes * 60_000);

  const id = await getNextSequence("consultation");
  const isFree = amountPoints <= 0;

  let room = null;
  let status = isFree ? "scheduled" : "pending_payment";
  let paymentStatus = isFree ? "not_required" : "pending";

  if (isFree) {
    room = jitsiMeetingDbFields(id);
  }

  const row = await ConsultationModel.create({
    id,
    requesterId: user.id,
    consultantId,
    message: message?.trim() || null,
    status,
    scheduledAt: when,
    scheduledEndAt: end,
    durationMinutes,
    amountInr: amountPoints,
    amountPoints,
    paymentStatus,
    ...(room ?? {}),
  });

  if (isFree) {
    void notifyMentorshipSessionConfirmed({
      consultantId,
      requesterId: user.id,
      requesterName: user.fullName,
      consultantName: consultant.fullName,
      consultationId: id,
      scheduledAt: when.toISOString(),
      meetingLink: room!.meetingLink,
    });
  } else {
    void notifyMentorshipBooking({
      consultantId,
      requesterName: user.fullName,
      consultationId: id,
    });
  }

  res.status(201).json(await enrichConsultation(row.toObject()));
});

/** Legacy request endpoint — redirects clients to slot booking */
router.post("/consultations", requireAuth, async (req, res): Promise<void> => {
  res.status(400).json({
    error: "Use POST /consultations/book with slotStartAt to book a mentorship session.",
  });
});

router.post("/consultations/:consultationId/pay", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number; fullName: string } }).currentUser;
  const raw = Array.isArray(req.params.consultationId)
    ? req.params.consultationId[0]
    : req.params.consultationId;
  const id = parseInt(raw, 10);

  try {
    const payment = await confirmConsultationPayment(id, user.id);
    const row = await ConsultationModel.findOne({ id }).lean();
    if (!row) {
      res.status(404).json({ error: "Consultation not found" });
      return;
    }
    const consultant = await findPublicUserById(row.consultantId);
    void notifyMentorshipSessionConfirmed({
      consultantId: row.consultantId,
      requesterId: row.requesterId,
      requesterName: user.fullName,
      consultantName: consultant?.fullName ?? "Mentor",
      consultationId: id,
      scheduledAt: row.scheduledAt?.toISOString() ?? "",
      meetingLink: payment.meetingLink,
    });
    res.json({ ...(await enrichConsultation(row)), payment });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Payment failed" });
  }
});

router.post("/consultations/:consultationId/join", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const raw = Array.isArray(req.params.consultationId)
    ? req.params.consultationId[0]
    : req.params.consultationId;
  const id = parseInt(raw, 10);

  const row = await ConsultationModel.findOne({ id }).lean();
  if (!row || (row.requesterId !== user.id && row.consultantId !== user.id)) {
    res.status(404).json({ error: "Consultation not found" });
    return;
  }

  if (!["scheduled", "waiting_for_participants", "started"].includes(row.status)) {
    res.status(400).json({ error: "This session is not open for joining" });
    return;
  }

  try {
    await recordConsultationJoin(id, user.id);
    const updated = await ConsultationModel.findOne({ id }).lean();
    res.json(await enrichConsultation(updated!));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Join failed" });
  }
});

router.get("/consultations/:consultationId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const raw = Array.isArray(req.params.consultationId)
    ? req.params.consultationId[0]
    : req.params.consultationId;
  const id = parseInt(raw, 10);

  const row = await ConsultationModel.findOne({ id }).lean();
  if (!row || (row.requesterId !== user.id && row.consultantId !== user.id)) {
    res.status(404).json({ error: "Consultation not found" });
    return;
  }

  res.json(await enrichConsultation(row));
});

router.patch("/consultations/:consultationId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const raw = Array.isArray(req.params.consultationId)
    ? req.params.consultationId[0]
    : req.params.consultationId;
  const id = parseInt(raw, 10);

  const parsed = UpdateConsultationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const row = await ConsultationModel.findOne({ id }).lean();
  if (!row) {
    res.status(404).json({ error: "Consultation not found" });
    return;
  }

  const isConsultant = row.consultantId === user.id;
  const isRequester = row.requesterId === user.id;
  if (!isConsultant && !isRequester) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { status } = parsed.data;
  if (!status) {
    res.status(400).json({ error: "No update provided" });
    return;
  }

  const update: Record<string, unknown> = {};

  if (status === "cancelled") {
    if (row.status === "started") {
      res.status(400).json({
        error:
          "Cannot cancel a live session. Mark it complete or raise a dispute if something went wrong.",
      });
      return;
    }
    if (!["pending_payment", "scheduled", "waiting_for_participants", "pending"].includes(row.status)) {
      res.status(400).json({ error: "Cannot cancel this session" });
      return;
    }
    update.status = "cancelled";
    update.sessionStatus = "cancelled";
    update.meetingStatus = "cancelled";
    if (row.pointsDeducted && !row.mentorPointsCredited) {
      await refundSessionPoints(
        id,
        row.requesterId,
        row.amountPoints ?? row.amountInr ?? 0,
      );
    } else if (row.pointsReserved && !row.pointsDeducted) {
      await releaseSessionReservation(id);
    }
  } else if (status === "completed") {
    if (!["scheduled", "waiting_for_participants", "started"].includes(row.status)) {
      res.status(400).json({ error: "Only active sessions can be marked complete" });
      return;
    }
    const amount = sessionPointsCost(row.amountPoints ?? row.amountInr ?? 0);
    if (amount > 0 && !row.pointsDeducted) {
      res.status(400).json({
        error:
          "Session has not gone live yet — points are charged when the mentor joins. Join the call first, or cancel if the mentor did not show up.",
      });
      return;
    }
    const scheduledAt = row.scheduledAt?.getTime() ?? 0;
    if (scheduledAt > Date.now() + 5 * 60_000) {
      res.status(400).json({
        error: "You can mark complete after the scheduled session time has started.",
      });
      return;
    }
    if (!isConsultant && !isRequester) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    update.status = "completed";
    update.sessionStatus = "completed";
    update.meetingStatus = "completed";
    update.actualEndAt = new Date();
    if (row.actualStartAt) {
      update.durationSeconds = Math.max(
        0,
        Math.floor((Date.now() - row.actualStartAt.getTime()) / 1000),
      );
    }
  } else if (status === "rejected") {
    if (!isConsultant || row.status !== "pending") {
      res.status(400).json({ error: "Only legacy pending requests can be declined" });
      return;
    }
    update.status = "rejected";
  } else {
    res.status(400).json({ error: "Invalid update" });
    return;
  }

  const updated = await ConsultationModel.findOneAndUpdate({ id }, update, { new: true }).lean();

  let pointsCreditedToMentor = 0;
  if (status === "completed") {
    await UserModel.updateOne(
      { id: row.consultantId },
      { $inc: { mentorshipSessionsCompleted: 1 } },
    );
    pointsCreditedToMentor = await creditMentorForSession(
      id,
      row.consultantId,
      row.amountPoints ?? row.amountInr ?? 0,
    );
  }

  res.json({
    ...(await enrichConsultation(updated!)),
    pointsCreditedToMentor,
  });
});

router.post("/consultations/:consultationId/dispute", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const raw = Array.isArray(req.params.consultationId)
    ? req.params.consultationId[0]
    : req.params.consultationId;
  const id = parseInt(raw, 10);
  const parsed = DisputeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  try {
    await raiseSessionDispute(id, user.id, parsed.data.reason);
    const updated = await ConsultationModel.findOne({ id }).lean();
    res.json(await enrichConsultation(updated!));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Could not open dispute" });
  }
});

export default router;
