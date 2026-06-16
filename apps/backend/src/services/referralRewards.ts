import { JobModel, UserModel, type ReferralDoc } from "@workspace/db";
import { REFERRAL_TRANSITIONS, type ReferralStatus } from "../lib/rewards";
import {
  getStageRewardAmounts,
  isRewardPointsEnabled,
  type RewardStage,
} from "../lib/reward-schedule";

export class ReferralRewardError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "ReferralRewardError";
  }
}

const STATUS_TO_STAGE: Partial<Record<ReferralStatus, RewardStage>> = {
  accepted: "accepted",
  referred: "referred",
  hired: "hired",
};

export function assertReferrerCanUpdate(referral: ReferralDoc, userId: number): void {
  if (referral.referrerId !== userId) {
    throw new ReferralRewardError("Only the job poster can update referral status", 403);
  }
}

export function assertValidTransition(
  currentStatus: string,
  nextStatus: ReferralStatus,
): void {
  const allowed = REFERRAL_TRANSITIONS[currentStatus as ReferralStatus];
  if (!allowed?.includes(nextStatus)) {
    throw new ReferralRewardError(
      `Cannot change status from "${currentStatus}" to "${nextStatus}"`,
      400,
    );
  }
}

export async function resolveReferralRewardPoints(referral: ReferralDoc): Promise<number> {
  if (referral.rewardPoints != null && referral.rewardPoints > 0) {
    return referral.rewardPoints;
  }
  const job = await JobModel.findOne({ id: referral.jobId }).lean();
  return job?.rewardPoints ?? 0;
}

async function transferPoints(
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
        ? `Requester does not have enough points for this step (needs ${deductAmount} pts, has ${requester?.totalPoints ?? 0}). They cannot complete the referral until they earn more points.`
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

/** Points when someone sends a referral request (% of job rewardPoints) */
export async function applyRequestRewards(
  requesterId: number,
  referrerId: number,
  jobRewardPoints: number,
): Promise<{ totalPointsDeducted: number; totalPointsCredited: number; rewardStagesApplied: string[] }> {
  const reward = getStageRewardAmounts(jobRewardPoints, "request");
  const { deducted, credited } = await transferPoints(
    requesterId,
    referrerId,
    reward.deductRequester,
    reward.creditReferrer,
  );

  return {
    totalPointsDeducted: deducted,
    totalPointsCredited: credited,
    rewardStagesApplied: isRewardPointsEnabled() ? ["request"] : [],
  };
}

/** Points on status update (% of stored job rewardPoints) */
export async function applyStatusRewards(
  referral: ReferralDoc,
  nextStatus: ReferralStatus,
): Promise<{ totalPointsDeducted: number; totalPointsCredited: number; rewardStagesApplied: string[] }> {
  const stage = STATUS_TO_STAGE[nextStatus];
  if (!stage) {
    return {
      totalPointsDeducted: referral.totalPointsDeducted ?? 0,
      totalPointsCredited: referral.totalPointsCredited ?? 0,
      rewardStagesApplied: referral.rewardStagesApplied ?? [],
    };
  }

  const applied = new Set<string>(referral.rewardStagesApplied ?? []);
  if (applied.has(stage)) {
    throw new ReferralRewardError(`Reward for "${stage}" was already applied`, 400);
  }

  const rewardPoints = await resolveReferralRewardPoints(referral);
  const reward = getStageRewardAmounts(rewardPoints, stage);
  const { deducted, credited } = await transferPoints(
    referral.requesterId,
    referral.referrerId,
    reward.deductRequester,
    reward.creditReferrer,
  );

  if (isRewardPointsEnabled()) {
    applied.add(stage);
  }

  return {
    totalPointsDeducted: (referral.totalPointsDeducted ?? 0) + deducted,
    totalPointsCredited: (referral.totalPointsCredited ?? 0) + credited,
    rewardStagesApplied: Array.from(applied),
  };
}

export async function getPointsSnapshot(referrerId: number, requesterId: number) {
  const [referrerUser, requesterUser] = await Promise.all([
    UserModel.findOne({ id: referrerId }).lean(),
    UserModel.findOne({ id: requesterId }).lean(),
  ]);
  return {
    referrerId,
    referrerPoints: referrerUser?.totalPoints ?? 0,
    requesterId,
    requesterPoints: requesterUser?.totalPoints ?? 0,
  };
}
