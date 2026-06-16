import { Router, type IRouter } from "express";
import {
  ReferralModel,
  JobModel,
  UserModel,
  MessageModel,
  getNextSequence,
  toReferral,
  toJob,
  toUserProfile,
  type ReferralDoc,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { ListReferralsQueryParams } from "@workspace/api-zod";
import {
  applyStatusRewards,
  applyRequestRewards,
  getPointsSnapshot,
  assertReferrerCanUpdate,
  assertValidTransition,
  ReferralRewardError,
} from "../services/referralRewards";
import type { ReferralStatus } from "../lib/rewards";
import { buildConversationId } from "../lib/conversation";
import {
  notifyReferralRequested,
  notifyReferralStatusChange,
} from "../services/notification-triggers";
import { referralAlreadyExistsMessage } from "../lib/referral-request";
import { assertRequesterCanSendReferral } from "../services/referralPointsGuard";

const router: IRouter = Router();

const UPDATE_STATUSES: ReferralStatus[] = [
  "accepted",
  "rejected",
  "referred",
  "interviewing",
  "hired",
  "rejected_after_interview",
];

async function enrichReferral(referral: ReferralDoc) {
  const job = await JobModel.findOne({ id: referral.jobId }).lean();
  const requester = await UserModel.findOne({ id: referral.requesterId }).lean();
  const referrer = await UserModel.findOne({ id: referral.referrerId }).lean();

  let enrichedJob = null;
  if (job) {
    const poster = await UserModel.findOne({ id: job.posterId }).lean();
    const referralCount = await ReferralModel.countDocuments({ jobId: job.id });
    enrichedJob = {
      ...toJob(job),
      poster: toUserProfile(poster),
      isSaved: false,
      referralCount,
    };
  }

  return {
    ...toReferral(referral),
    job: enrichedJob,
    requester: toUserProfile(requester),
    referrer: toUserProfile(referrer),
  };
}

router.get("/referrals", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const parsed = ListReferralsQueryParams.safeParse(req.query);
  const role = parsed.success ? parsed.data.role : undefined;

  let filter: Record<string, unknown>;
  if (role === "requester") {
    filter = { requesterId: user.id };
  } else if (role === "referrer") {
    filter = { referrerId: user.id };
  } else {
    filter = { $or: [{ requesterId: user.id }, { referrerId: user.id }] };
  }

  const referrals = await ReferralModel.find(filter).sort({ createdAt: -1 }).lean();
  const enriched = await Promise.all(referrals.map(enrichReferral));
  res.json(enriched);
});

router.post("/referrals", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const jobId = Number(req.body?.jobId);
  const note = typeof req.body?.note === "string" ? req.body.note : null;

  if (!jobId || Number.isNaN(jobId)) {
    res.status(400).json({ error: "jobId is required" });
    return;
  }

  const job = await JobModel.findOne({ id: jobId }).lean();
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.posterId === user.id) {
    res.status(400).json({ error: "Cannot request referral for your own job" });
    return;
  }

  const existing = await ReferralModel.findOne({
    jobId,
    requesterId: user.id,
  }).lean();

  if (existing) {
    res.status(409).json({
      error: referralAlreadyExistsMessage(existing.status),
      code: "REFERRAL_ALREADY_EXISTS",
      existingStatus: existing.status,
    });
    return;
  }

  try {
    await assertRequesterCanSendReferral(user.id, job.rewardPoints);
    const requestRewards = await applyRequestRewards(user.id, job.posterId, job.rewardPoints);

    const id = await getNextSequence("referral");
    const referral = await ReferralModel.create({
      id,
      jobId,
      requesterId: user.id,
      referrerId: job.posterId,
      note,
      rewardPoints: job.rewardPoints,
      rewardStagesApplied: requestRewards.rewardStagesApplied,
      totalPointsDeducted: requestRewards.totalPointsDeducted,
      totalPointsCredited: requestRewards.totalPointsCredited,
    });

    const conversationId = buildConversationId(user.id, job.posterId);
    const intro = note?.trim()
      ? `📩 Referral request: ${note.trim()}`
      : "📩 I would like a referral for this job. Happy to share my resume if needed.";
    const messageId = await getNextSequence("message");
    await MessageModel.create({
      id: messageId,
      conversationId,
      senderId: user.id,
      content: intro,
    });

    void notifyReferralRequested({
      referrerId: job.posterId,
      requesterName: user.fullName,
      jobTitle: job.title,
      referralId: id,
    });

    res.status(201).json({
      ...(await enrichReferral(referral.toObject())),
      pointsUpdate: await getPointsSnapshot(job.posterId, user.id),
    });
  } catch (err) {
    if (err instanceof ReferralRewardError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("Referral create error:", err);
    res.status(500).json({ error: "Failed to create referral request" });
  }
});

router.get("/referrals/:referralId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const raw = Array.isArray(req.params.referralId) ? req.params.referralId[0] : req.params.referralId;
  const id = parseInt(raw, 10);

  const referral = await ReferralModel.findOne({ id }).lean();
  if (!referral || (referral.requesterId !== user.id && referral.referrerId !== user.id)) {
    res.status(404).json({ error: "Referral not found" });
    return;
  }

  res.json(await enrichReferral(referral));
});

router.patch("/referrals/:referralId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const raw = Array.isArray(req.params.referralId) ? req.params.referralId[0] : req.params.referralId;
  const id = parseInt(raw, 10);

  const nextStatus = req.body?.status as ReferralStatus | undefined;
  if (!nextStatus || !UPDATE_STATUSES.includes(nextStatus)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  try {
    const referral = await ReferralModel.findOne({ id }).lean();
    if (!referral) {
      res.status(404).json({ error: "Referral not found" });
      return;
    }

    assertReferrerCanUpdate(referral, user.id);
    assertValidTransition(referral.status, nextStatus);

    const updateData: Record<string, unknown> = { status: nextStatus };
    if (req.body?.interviewStatus != null) {
      updateData.interviewStatus = req.body.interviewStatus;
    }
    if (req.body?.note != null) {
      updateData.note = req.body.note;
    }

    const rewards = await applyStatusRewards(referral, nextStatus);
    updateData.rewardStagesApplied = rewards.rewardStagesApplied;
    updateData.totalPointsDeducted = rewards.totalPointsDeducted;
    updateData.totalPointsCredited = rewards.totalPointsCredited;

    if (nextStatus === "hired") {
      updateData.rewardTransferred = true;
    }

    const updated = await ReferralModel.findOneAndUpdate(
      { id },
      updateData,
      { new: true },
    ).lean();

    const job = await JobModel.findOne({ id: updated!.jobId }).lean();
    void notifyReferralStatusChange({
      requesterId: updated!.requesterId,
      referrerName: user.fullName,
      jobTitle: job?.title ?? "a job",
      status: nextStatus,
      referralId: updated!.id,
    });

    res.json({
      ...(await enrichReferral(updated!)),
      pointsUpdate: await getPointsSnapshot(updated!.referrerId, updated!.requesterId),
    });
  } catch (err) {
    if (err instanceof ReferralRewardError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("Referral update error:", err);
    res.status(500).json({ error: "Failed to update referral" });
  }
});

export default router;
