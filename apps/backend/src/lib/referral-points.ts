import {
  getRemainingRequesterPipeline,
  getTotalRequesterPipeline,
  isRewardPointsEnabled,
} from "./reward-schedule";

export type ActiveReferralPoints = {
  rewardPoints: number;
  rewardStagesApplied?: string[];
};

export type ReferralPointsSnapshot = {
  pointsEnabled: boolean;
  availablePoints: number;
  reservedForActive: number;
  newRequestPipeline: number;
  requiredToSend: number;
  canSend: boolean;
  shortfall: number;
  jobRewardPoints: number;
};

export function isActiveReferralStatus(status: string): boolean {
  return ["pending", "accepted", "referred", "interviewing"].includes(status);
}

export function computeReferralPointsSnapshot(
  availablePoints: number,
  activeReferrals: ActiveReferralPoints[],
  newJobRewardPoints: number,
): ReferralPointsSnapshot {
  const pointsEnabled = isRewardPointsEnabled();

  if (!pointsEnabled) {
    return {
      pointsEnabled: false,
      availablePoints,
      reservedForActive: 0,
      newRequestPipeline: 0,
      requiredToSend: 0,
      canSend: true,
      shortfall: 0,
      jobRewardPoints: newJobRewardPoints,
    };
  }

  const reservedForActive = activeReferrals.reduce(
    (sum, r) =>
      sum + getRemainingRequesterPipeline(r.rewardPoints, r.rewardStagesApplied ?? []),
    0,
  );
  const newRequestPipeline = getTotalRequesterPipeline(newJobRewardPoints);
  const requiredToSend = reservedForActive + newRequestPipeline;
  const shortfall = Math.max(0, requiredToSend - availablePoints);

  return {
    pointsEnabled: true,
    availablePoints,
    reservedForActive,
    newRequestPipeline,
    requiredToSend,
    canSend: shortfall === 0,
    shortfall,
    jobRewardPoints: newJobRewardPoints,
  };
}

export function referralPointsErrorMessage(snapshot: ReferralPointsSnapshot): string {
  if (!snapshot.pointsEnabled) return "Points transfers are disabled in this environment.";

  const parts = [
    `You need ${snapshot.requiredToSend} pts available to send this referral`,
    `(${snapshot.newRequestPipeline} pts = full path on this ${snapshot.jobRewardPoints} pt opening`,
  ];
  if (snapshot.reservedForActive > 0) {
    parts.push(`+ ${snapshot.reservedForActive} pts reserved for your other active requests`);
  }
  parts.push(`). You have ${snapshot.availablePoints} pts.`);
  return parts.join(" ");
}
