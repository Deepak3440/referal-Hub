import {
  UserModel,
  JobModel,
  CompanyReferralRequestModel,
  MessageModel,
  getNextSequence,
  toUserProfile,
  toCompanyReferralRequest,
  publiclyVisibleUserFilter,
} from "@workspace/db";
import { findPublicUserById, findPublicUsersByIds, toPublicUserProfile } from "../lib/public-user";
import { buildConversationId } from "../lib/conversation";
import { createNotification } from "./notification.service";
import { REFERRAL_TRANSITIONS, type ReferralStatus } from "../lib/rewards";
import {
  getStageRewardAmounts,
  isRewardPointsEnabled,
  type RewardStage,
} from "../lib/reward-schedule";
import { assertValidTransition, ReferralRewardError } from "./referralRewards";

const DEFAULT_COMPANY_REWARD_POINTS = Number(process.env.DEFAULT_COMPANY_REFERRAL_REWARD_POINTS ?? 100);

export type CompanyReferrerRow = {
  company: string;
  companyKey: string;
  referrerCount: number;
  jobCount: number;
};

/** What this alumni sees — workflow status when they are the active handler */
export type CompanyReferrerViewStatus =
  | "pending"
  | "personal_rejected"
  | "already_referred"
  | ReferralStatus;

const STATUS_TO_STAGE: Partial<Record<ReferralStatus, RewardStage>> = {
  accepted: "accepted",
  referred: "referred",
  hired: "hired",
};

function normalizeWorkflowStatus(status: string): ReferralStatus {
  if (status === "declined" || status === "closed") return "rejected";
  return status as ReferralStatus;
}

function getReferrerViewStatus(
  doc: {
    status?: string;
    acceptedByReferrerId?: number | null;
    rejectedReferrerIds?: number[];
  },
  referrerId: number,
): CompanyReferrerViewStatus {
  if (doc.rejectedReferrerIds?.includes(referrerId) && doc.acceptedByReferrerId !== referrerId) {
    return "personal_rejected";
  }
  if (doc.acceptedByReferrerId != null && doc.acceptedByReferrerId !== referrerId) {
    return "already_referred";
  }
  if (doc.acceptedByReferrerId === referrerId) {
    return normalizeWorkflowStatus(doc.status ?? "accepted");
  }
  return "pending";
}

function resolveRewardPoints(doc: { rewardPoints?: number | null }): number {
  return doc.rewardPoints != null && doc.rewardPoints > 0
    ? doc.rewardPoints
    : DEFAULT_COMPANY_REWARD_POINTS;
}

async function transferCompanyPoints(
  requesterId: number,
  referrerId: number,
  deductAmount: number,
  creditAmount: number,
): Promise<{ deducted: number; credited: number }> {
  if (!isRewardPointsEnabled() || (deductAmount <= 0 && creditAmount <= 0)) {
    return { deducted: 0, credited: 0 };
  }

  const requester = await UserModel.findOne({ id: requesterId }).lean();
  if (!requester || requester.totalPoints < deductAmount) {
    throw new ReferralRewardError(
      deductAmount > 0
        ? `Requester does not have enough points for this step (needs ${deductAmount} pts, has ${requester?.totalPoints ?? 0}).`
        : "Requester not found",
      400,
    );
  }

  await UserModel.updateOne({ id: requesterId }, { $inc: { totalPoints: -deductAmount } });
  if (creditAmount > 0) {
    await UserModel.updateOne({ id: referrerId }, { $inc: { totalPoints: creditAmount } });
  }

  return { deducted: deductAmount, credited: creditAmount };
}

async function applyCompanyRequestDeduct(
  requesterId: number,
  rewardPoints: number,
): Promise<{ totalPointsDeducted: number; rewardStagesApplied: string[] }> {
  const reward = getStageRewardAmounts(rewardPoints, "request");
  const { deducted } = await transferCompanyPoints(requesterId, requesterId, reward.deductRequester, 0);
  return {
    totalPointsDeducted: deducted,
    rewardStagesApplied: isRewardPointsEnabled() ? ["request"] : [],
  };
}

async function applyCompanyStatusRewards(
  doc: {
    requesterId: number;
    rewardPoints?: number | null;
    rewardStagesApplied?: string[];
    totalPointsDeducted?: number;
    totalPointsCredited?: number;
  },
  referrerId: number,
  nextStatus: ReferralStatus,
): Promise<{
  totalPointsDeducted: number;
  totalPointsCredited: number;
  rewardStagesApplied: string[];
}> {
  const stage = STATUS_TO_STAGE[nextStatus];
  if (!stage) {
    return {
      totalPointsDeducted: doc.totalPointsDeducted ?? 0,
      totalPointsCredited: doc.totalPointsCredited ?? 0,
      rewardStagesApplied: doc.rewardStagesApplied ?? [],
    };
  }

  const applied = new Set<string>(doc.rewardStagesApplied ?? []);
  if (applied.has(stage)) {
    throw new ReferralRewardError(`Reward for "${stage}" was already applied`, 400);
  }

  const rewardPoints = resolveRewardPoints(doc);
  const reward = getStageRewardAmounts(rewardPoints, stage);
  const { deducted, credited } = await transferCompanyPoints(
    doc.requesterId,
    referrerId,
    reward.deductRequester,
    reward.creditReferrer,
  );

  if (isRewardPointsEnabled()) {
    applied.add(stage);
  }

  return {
    totalPointsDeducted: (doc.totalPointsDeducted ?? 0) + deducted,
    totalPointsCredited: (doc.totalPointsCredited ?? 0) + credited,
    rewardStagesApplied: Array.from(applied),
  };
}

async function notifyCompanyStatusChange(params: {
  requesterId: number;
  company: string;
  roleTitle: string;
  status: ReferralStatus;
  requestId: number;
}) {
  const labels: Partial<Record<ReferralStatus, string>> = {
    accepted: "accepted your company referral request",
    referred: "marked you as referred",
    interviewing: "scheduled your interview",
    hired: "marked you as hired",
    rejected: "declined your company referral request",
    rejected_after_interview: "marked you as not selected after interview",
  };
  const msg = labels[params.status];
  if (!msg) return;

  await createNotification({
    userId: params.requesterId,
    type: "company_referral_requested",
    title: "Company referral update",
    message: `An alumni at ${params.company} ${msg} for ${params.roleTitle}.`,
    referenceId: params.requestId,
    referenceType: "company_referral",
    linkPath: "/referrals",
  });
}

function countPendingReferrers(doc: {
  referrerIds?: number[];
  acceptedByReferrerId?: number | null;
  rejectedReferrerIds?: number[];
}): number {
  if (doc.acceptedByReferrerId != null) return 0;
  const rejected = new Set(doc.rejectedReferrerIds ?? []);
  return (doc.referrerIds ?? []).filter((id) => !rejected.has(id)).length;
}

function normalizeCompanyKey(company: string): string {
  return company.trim().toLowerCase();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listCompanyReferrers(
  search?: string,
  excludeUserId?: number,
): Promise<CompanyReferrerRow[]> {
  const alumni = await UserModel.find({
    memberType: "alumni",
    company: { $exists: true, $nin: [null, ""] },
    ...publiclyVisibleUserFilter,
  })
    .select("id company")
    .lean();

  const grouped = new Map<string, { company: string; referrerIds: Set<number> }>();

  for (const user of alumni) {
    if (excludeUserId != null && user.id === excludeUserId) continue;
    const company = user.company?.trim();
    if (!company) continue;
    const key = normalizeCompanyKey(company);
    const existing = grouped.get(key);
    if (existing) {
      existing.referrerIds.add(user.id);
      if (company.length > existing.company.length) {
        existing.company = company;
      }
    } else {
      grouped.set(key, { company, referrerIds: new Set([user.id]) });
    }
  }

  const jobs = await JobModel.find({ status: { $ne: "closed" } })
    .select("company posterId")
    .lean();
  const jobCounts = new Map<string, number>();
  for (const job of jobs) {
    if (excludeUserId != null && job.posterId === excludeUserId) continue;
    const company = job.company?.trim();
    if (!company) continue;
    const key = normalizeCompanyKey(company);
    jobCounts.set(key, (jobCounts.get(key) ?? 0) + 1);
  }

  let rows: CompanyReferrerRow[] = Array.from(grouped.entries())
    .map(([companyKey, value]) => ({
      company: value.company,
      companyKey,
      referrerCount: value.referrerIds.size,
      jobCount: jobCounts.get(companyKey) ?? 0,
    }))
    .filter((row) => row.referrerCount > 0);

  const q = search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => row.company.toLowerCase().includes(q));
  }

  rows.sort((a, b) => b.referrerCount - a.referrerCount || a.company.localeCompare(b.company));
  return rows;
}

export async function listCompanyReferralRequestsForRequester(requesterId: number) {
  const items = await CompanyReferralRequestModel.find({ requesterId })
    .sort({ createdAt: -1 })
    .lean();

  const handlerIds = [
    ...new Set(
      items
        .map((item) => item.acceptedByReferrerId)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];
  const handlers = await findPublicUsersByIds(handlerIds);
  const handlerMap = new Map(handlers.map((u) => [u.id, toPublicUserProfile(u)]));

  return items.map((doc) => ({
    ...toCompanyReferralRequest(doc),
    referrerCount: doc.referrerIds?.length ?? 0,
    pendingReferrerCount: countPendingReferrers(doc),
    workflowStatus: normalizeWorkflowStatus(doc.status ?? "pending"),
    rewardPoints: resolveRewardPoints(doc),
    handlerReferrer: doc.acceptedByReferrerId
      ? (handlerMap.get(doc.acceptedByReferrerId) ?? null)
      : null,
  }));
}

export async function listCompanyReferralRequestsForReferrer(referrerId: number) {
  const items = await CompanyReferralRequestModel.find({ referrerIds: referrerId })
    .sort({ createdAt: -1 })
    .lean();

  const requesterIds = [...new Set(items.map((item) => item.requesterId))];
  const requesters = await findPublicUsersByIds(requesterIds);
  const requesterMap = new Map(requesters.map((u) => [u.id, toUserProfile(u)]));

  return items.map((doc) => ({
    ...toCompanyReferralRequest(doc),
    requester: requesterMap.get(doc.requesterId) ?? null,
    referrerStatus: getReferrerViewStatus(doc, referrerId),
    rewardPoints: resolveRewardPoints(doc),
    workflowStatus: normalizeWorkflowStatus(doc.status ?? "pending"),
  }));
}

export async function findReferrersAtCompany(company: string, excludeUserId?: number) {
  const key = normalizeCompanyKey(company);
  const filter: Record<string, unknown> = {
    memberType: "alumni",
    company: { $regex: new RegExp(`^${escapeRegex(company.trim())}$`, "i") },
    ...publiclyVisibleUserFilter,
  };
  if (excludeUserId != null) {
    filter.id = { $ne: excludeUserId };
  }
  const referrers = await UserModel.find(filter).lean();
  return referrers.filter((r) => normalizeCompanyKey(r.company ?? "") === key);
}

function buildCompanyRequestMessage(params: {
  company: string;
  roleTitle: string;
  jobUrl: string;
  note: string;
  resumeUrl?: string | null;
}) {
  const lines = [
    `🏢 Company referral request at ${params.company}`,
    `Role: ${params.roleTitle}`,
    `Job link: ${params.jobUrl}`,
    "",
    params.note.trim(),
  ];
  if (params.resumeUrl) {
    lines.push("", `Resume: ${params.resumeUrl}`);
  }
  return lines.join("\n");
}

export async function createCompanyReferralRequest(params: {
  requesterId: number;
  requesterName: string;
  company: string;
  roleTitle: string;
  jobUrl: string;
  note: string;
  resumeUrl?: string | null;
}) {
  const companyKey = normalizeCompanyKey(params.company);
  const allAtCompany = await findReferrersAtCompany(params.company);
  const referrers = await findReferrersAtCompany(params.company, params.requesterId);

  if (referrers.length === 0) {
    const onlySelf =
      allAtCompany.length === 1 && allAtCompany[0]?.id === params.requesterId;
    const err = new Error(
      onlySelf
        ? "You are the only alumni referrer at this company. You cannot request a referral from yourself — use a student account, or ask a teammate to join as alumni."
        : allAtCompany.length === 0
          ? "No alumni referrers at this company yet. Alumni must set their company on profile."
          : "No other alumni referrers available at this company.",
    );
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }

  const existing = await CompanyReferralRequestModel.findOne({
    requesterId: params.requesterId,
    companyKey,
  }).lean();

  if (existing) {
    const err = new Error("You already sent a company referral request for this company.");
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const id = await getNextSequence("companyReferralRequest");
  const referrerIds = referrers.map((r) => r.id);
  const rewardPoints = DEFAULT_COMPANY_REWARD_POINTS;
  const requestRewards = await applyCompanyRequestDeduct(params.requesterId, rewardPoints);

  const request = await CompanyReferralRequestModel.create({
    id,
    requesterId: params.requesterId,
    company: params.company.trim(),
    companyKey,
    roleTitle: params.roleTitle.trim(),
    jobUrl: params.jobUrl.trim(),
    note: params.note.trim(),
    resumeUrl: params.resumeUrl ?? null,
    referrerIds,
    status: "pending",
    rewardPoints,
    rewardStagesApplied: requestRewards.rewardStagesApplied,
    totalPointsDeducted: requestRewards.totalPointsDeducted,
    totalPointsCredited: 0,
  });

  const messageBody = buildCompanyRequestMessage(params);

  await Promise.all(
    referrers.map(async (referrer) => {
      const conversationId = buildConversationId(params.requesterId, referrer.id);
      const messageId = await getNextSequence("message");
      await MessageModel.create({
        id: messageId,
        conversationId,
        senderId: params.requesterId,
        content: messageBody,
      });

      await createNotification({
        userId: referrer.id,
        type: "company_referral_requested",
        title: "Company referral request",
        message: `${params.requesterName} requested a referral at ${params.company} for ${params.roleTitle}.`,
        referenceId: id,
        referenceType: "company_referral",
        linkPath: "/my-listings",
      });
    }),
  );

  const requester = await UserModel.findOne({ id: params.requesterId }).lean();
  return {
    ...toCompanyReferralRequest(request.toObject()),
    requester: toUserProfile(requester),
    referrerCount: referrerIds.length,
  };
}

export async function updateCompanyReferralStatus(params: {
  requestId: number;
  referrerId: number;
  nextStatus: ReferralStatus;
}) {
  const request = await CompanyReferralRequestModel.findOne({ id: params.requestId }).lean();
  if (!request) {
    const err = new Error("Company referral request not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }

  if (!request.referrerIds?.includes(params.referrerId)) {
    const err = new Error("You are not a referrer on this request");
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }

  const viewStatus = getReferrerViewStatus(request, params.referrerId);

  // Personal decline before anyone accepts — only affects this alumni
  if (
    params.nextStatus === "rejected" &&
    !request.acceptedByReferrerId &&
    viewStatus === "pending"
  ) {
    if (request.rejectedReferrerIds?.includes(params.referrerId)) {
      return listSingleIncomingForReferrer(params.requestId, params.referrerId);
    }

    const rejected = [...(request.rejectedReferrerIds ?? []), params.referrerId];
    const allRejected = rejected.length >= (request.referrerIds?.length ?? 0);

    await CompanyReferralRequestModel.updateOne(
      { id: params.requestId },
      {
        $set: {
          rejectedReferrerIds: rejected,
          ...(allRejected ? { status: "rejected" } : {}),
        },
      },
    );

    if (allRejected) {
      await notifyCompanyStatusChange({
        requesterId: request.requesterId,
        company: request.company,
        roleTitle: request.roleTitle,
        status: "rejected",
        requestId: request.id,
      });
    }

    return listSingleIncomingForReferrer(params.requestId, params.referrerId);
  }

  if (viewStatus === "personal_rejected") {
    throw new ReferralRewardError("You already declined this request", 409);
  }
  if (viewStatus === "already_referred") {
    throw new ReferralRewardError("This request is already being handled by another alumni", 409);
  }

  // First accept — claim request atomically
  if (params.nextStatus === "accepted" && !request.acceptedByReferrerId) {
    const rewards = await applyCompanyStatusRewards(request, params.referrerId, "accepted");

    const updated = await CompanyReferralRequestModel.findOneAndUpdate(
      { id: params.requestId, acceptedByReferrerId: null },
      {
        $set: {
          acceptedByReferrerId: params.referrerId,
          status: "accepted",
          rewardStagesApplied: rewards.rewardStagesApplied,
          totalPointsDeducted: rewards.totalPointsDeducted,
          totalPointsCredited: rewards.totalPointsCredited,
        },
      },
      { returnDocument: "after" },
    ).lean();

    if (!updated) {
      throw new ReferralRewardError("This request was already accepted by another alumni", 409);
    }

    await notifyCompanyStatusChange({
      requesterId: updated.requesterId,
      company: updated.company,
      roleTitle: updated.roleTitle,
      status: "accepted",
      requestId: updated.id,
    });

    return listSingleIncomingForReferrer(params.requestId, params.referrerId);
  }

  // Further workflow — only the accepting alumni
  if (request.acceptedByReferrerId !== params.referrerId) {
    throw new ReferralRewardError("Only the alumni handling this request can update status", 403);
  }

  const currentStatus = normalizeWorkflowStatus(request.status ?? "accepted");
  assertValidTransition(currentStatus, params.nextStatus);

  const rewards = await applyCompanyStatusRewards(request, params.referrerId, params.nextStatus);

  await CompanyReferralRequestModel.updateOne(
    { id: params.requestId },
    {
      $set: {
        status: params.nextStatus,
        rewardStagesApplied: rewards.rewardStagesApplied,
        totalPointsDeducted: rewards.totalPointsDeducted,
        totalPointsCredited: rewards.totalPointsCredited,
      },
    },
  );

  await notifyCompanyStatusChange({
    requesterId: request.requesterId,
    company: request.company,
    roleTitle: request.roleTitle,
    status: params.nextStatus,
    requestId: request.id,
  });

  return listSingleIncomingForReferrer(params.requestId, params.referrerId);
}

/** @deprecated Use updateCompanyReferralStatus */
export async function respondToCompanyReferralRequest(params: {
  requestId: number;
  referrerId: number;
  action: "accept" | "reject";
}) {
  return updateCompanyReferralStatus({
    requestId: params.requestId,
    referrerId: params.referrerId,
    nextStatus: params.action === "accept" ? "accepted" : "rejected",
  });
}

async function listSingleIncomingForReferrer(requestId: number, referrerId: number) {
  const doc = await CompanyReferralRequestModel.findOne({ id: requestId }).lean();
  if (!doc) {
    const err = new Error("Company referral request not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }

  const requester = await findPublicUserById(doc.requesterId);
  return {
    ...toCompanyReferralRequest(doc),
    requester: toPublicUserProfile(requester),
    referrerStatus: getReferrerViewStatus(doc, referrerId),
    rewardPoints: resolveRewardPoints(doc),
    workflowStatus: normalizeWorkflowStatus(doc.status ?? "pending"),
  };
}
