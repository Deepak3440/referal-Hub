import { JobModel, ReferralModel, UserModel } from "@workspace/db";
import {
  computeReferralPointsSnapshot,
  referralPointsErrorMessage,
} from "../lib/referral-points";
import { isRewardPointsEnabled } from "../lib/reward-schedule";
import { ReferralRewardError, resolveReferralRewardPoints } from "./referralRewards";

/** Ensures requester can pay for a new full referral pipeline + active commitments */
export async function assertRequesterCanSendReferral(
  requesterId: number,
  newJobRewardPoints: number,
): Promise<void> {
  if (!isRewardPointsEnabled()) return;

  const user = await UserModel.findOne({ id: requesterId }).lean();
  if (!user) {
    throw new ReferralRewardError("User not found", 404);
  }

  const activeReferrals = await ReferralModel.find({
    requesterId,
    status: { $in: ["pending", "accepted", "referred", "interviewing"] },
  }).lean();

  const activeWithBudget = await Promise.all(
    activeReferrals.map(async (r) => ({
      rewardPoints: await resolveReferralRewardPoints(r),
      rewardStagesApplied: r.rewardStagesApplied ?? [],
    })),
  );

  const snapshot = computeReferralPointsSnapshot(
    user.totalPoints,
    activeWithBudget,
    newJobRewardPoints,
  );

  if (!snapshot.canSend) {
    throw new ReferralRewardError(referralPointsErrorMessage(snapshot), 400);
  }
}
