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
import { requireAuth } from "../middlewares/auth";
import { normalizeGoogleMeetLink } from "../lib/meet-link";
import { createGoogleMeetLink, isGoogleMeetAutoCreateEnabled } from "../services/googleMeet";
import {
  notifyMentorshipBooking,
  notifyMentorshipUpdate,
} from "../services/notification-triggers";

const router: IRouter = Router();

const CreateConsultationBody = z.object({
  consultantId: z.number().int().positive(),
  message: z.string().max(1000).optional(),
});

const UpdateConsultationBody = z.object({
  status: z.enum(["scheduled", "rejected", "completed", "cancelled"]).optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(15).max(120).optional(),
  meetingLink: z.string().url().optional(),
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

async function resolveMeetingLink(
  row: ConsultationDoc,
  when: Date,
  durationMinutes: number,
  manualLink?: string | null,
): Promise<string> {
  if (manualLink?.trim()) {
    return normalizeGoogleMeetLink(manualLink);
  }

  if (!isGoogleMeetAutoCreateEnabled()) {
    throw new Error(
      "Google Meet link is required. Open https://meet.google.com/new, create a meeting, and paste the link here.",
    );
  }

  const [consultant, requester] = await Promise.all([
    UserModel.findOne({ id: row.consultantId }).lean(),
    UserModel.findOne({ id: row.requesterId }).lean(),
  ]);

  return createGoogleMeetLink({
    consultationId: row.id,
    title: `1:1 Consulting — ${requester?.fullName ?? "Session"}`,
    scheduledAt: when,
    durationMinutes,
    consultantEmail: consultant?.email ?? null,
    requesterEmail: requester?.email ?? null,
  });
}

router.get("/consultations/meet-config", requireAuth, (_req, res): void => {
  res.json({ autoMeetEnabled: isGoogleMeetAutoCreateEnabled() });
});

/** List consultants for 1:1 mentorship — server-side filters + pagination */
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

router.get("/consultations", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const role = typeof req.query.role === "string" ? req.query.role : "all";

  let filter: Record<string, unknown>;
  if (role === "requester") {
    filter = { requesterId: user.id };
  } else if (role === "consultant") {
    filter = { consultantId: user.id };
  } else {
    filter = { $or: [{ requesterId: user.id }, { consultantId: user.id }] };
  }

  const rows = await ConsultationModel.find(filter).sort({ createdAt: -1 }).lean();
  res.json(await Promise.all(rows.map(enrichConsultation)));
});

router.post("/consultations", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const parsed = CreateConsultationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { consultantId, message } = parsed.data;
  if (consultantId === user.id) {
    res.status(400).json({ error: "Cannot request consulting with yourself" });
    return;
  }

  const consultant = await findPublicUserById(consultantId);
  if (!consultant?.isConsultant) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const existing = await ConsultationModel.findOne({
    requesterId: user.id,
    consultantId,
    status: { $in: ["pending", "scheduled"] },
  }).lean();

  if (existing) {
    res.status(400).json({ error: "You already have an active consulting request with this person" });
    return;
  }

  const id = await getNextSequence("consultation");
  const row = await ConsultationModel.create({
    id,
    requesterId: user.id,
    consultantId,
    message: message?.trim() || null,
    status: "pending",
  });

  void notifyMentorshipBooking({
    consultantId,
    requesterName: user.fullName,
    consultationId: id,
  });

  res.status(201).json(await enrichConsultation(row.toObject()));
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

  const { status, scheduledAt, durationMinutes, meetingLink } = parsed.data;
  const update: Record<string, unknown> = {};

  if (status === "rejected" || status === "scheduled") {
    if (!isConsultant) {
      res.status(403).json({ error: "Only the consultant can accept or reject requests" });
      return;
    }
    if (row.status !== "pending") {
      res.status(400).json({ error: "Only pending requests can be accepted or rejected" });
      return;
    }
    update.status = status;
    if (status === "scheduled") {
      if (!scheduledAt) {
        res.status(400).json({ error: "scheduledAt is required when booking a session" });
        return;
      }
      const when = new Date(scheduledAt);
      if (when.getTime() <= Date.now()) {
        res.status(400).json({ error: "Please pick a future date and time" });
        return;
      }
      update.scheduledAt = when;
      update.durationMinutes = durationMinutes ?? 30;
      try {
        update.meetingLink = await resolveMeetingLink(
          row,
          when,
          durationMinutes ?? 30,
          meetingLink,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create Meet link";
        res.status(400).json({ error: message });
        return;
      }
    }
  } else if (status === "cancelled") {
    if (!["pending", "scheduled"].includes(row.status)) {
      res.status(400).json({ error: "Cannot cancel this session" });
      return;
    }
    update.status = "cancelled";
  } else if (status === "completed") {
    if (row.status !== "scheduled") {
      res.status(400).json({ error: "Only scheduled sessions can be marked complete" });
      return;
    }
    update.status = "completed";
  } else if (scheduledAt && isConsultant && row.status === "pending") {
    res.status(400).json({ error: "Use status scheduled with scheduledAt to book" });
    return;
  } else {
    res.status(400).json({ error: "Invalid update" });
    return;
  }

  const updated = await ConsultationModel.findOneAndUpdate(
    { id },
    update,
    { new: true },
  ).lean();

  if (status === "completed") {
    await UserModel.updateOne(
      { id: row.consultantId },
      { $inc: { mentorshipSessionsCompleted: 1 } },
    );
  }

  if (status === "scheduled" || status === "rejected") {
    const consultant = await UserModel.findOne({ id: row.consultantId }).lean();
    void notifyMentorshipUpdate({
      requesterId: row.requesterId,
      consultantName: consultant?.fullName ?? "Mentor",
      consultationId: id,
      status,
    });
  }

  res.json(await enrichConsultation(updated!));
});

export default router;
