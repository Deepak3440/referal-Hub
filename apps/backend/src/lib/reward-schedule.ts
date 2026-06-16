/** Percent-of-job-rewardPoints schedule + feature toggle (env-configurable). */

export type RewardStage = "request" | "accepted" | "referred" | "hired";

function pct(envKey: string, fallback: number): number {
  const v = process.env[envKey];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Set REWARDS_POINTS_ENABLED=false in test env to skip all point transfers */
export function isRewardPointsEnabled(): boolean {
  return process.env.REWARDS_POINTS_ENABLED !== "false";
}

/** % of job.rewardPoints per stage — requester deduction / referrer credit */
export const STAGE_PERCENT = {
  request: {
    deduct: pct("REWARDS_REQUEST_DEDUCT_PCT", 10),
    credit: pct("REWARDS_REQUEST_CREDIT_PCT", 10),
  },
  accepted: {
    deduct: pct("REWARDS_ACCEPT_DEDUCT_PCT", 10),
    credit: pct("REWARDS_ACCEPT_CREDIT_PCT", 20),
  },
  referred: {
    deduct: pct("REWARDS_REFERRED_DEDUCT_PCT", 30),
    credit: pct("REWARDS_REFERRED_CREDIT_PCT", 30),
  },
  hired: {
    deduct: pct("REWARDS_HIRED_DEDUCT_PCT", 50),
    credit: pct("REWARDS_HIRED_CREDIT_PCT", 50),
  },
} as const satisfies Record<RewardStage, { deduct: number; credit: number }>;

const FUTURE_STAGES: RewardStage[] = ["accepted", "referred", "hired"];

export function roundRewardPoints(value: number): number {
  return Math.max(0, Math.round(value));
}

export function pointsFromPercent(rewardPoints: number, percent: number): number {
  if (rewardPoints <= 0 || percent <= 0) return 0;
  return roundRewardPoints((rewardPoints * percent) / 100);
}

export function getStageRequesterPoints(rewardPoints: number, stage: RewardStage): number {
  return pointsFromPercent(rewardPoints, STAGE_PERCENT[stage].deduct);
}

export function getStageReferrerPoints(rewardPoints: number, stage: RewardStage): number {
  return pointsFromPercent(rewardPoints, STAGE_PERCENT[stage].credit);
}

export function getStageRewardAmounts(rewardPoints: number, stage: RewardStage) {
  return {
    deductRequester: getStageRequesterPoints(rewardPoints, stage),
    creditReferrer: getStageReferrerPoints(rewardPoints, stage),
  };
}

/** Total requester cost if referral runs send → hired (sums deduct %) */
export function getTotalRequesterPipeline(rewardPoints: number): number {
  if (!isRewardPointsEnabled()) return 0;
  return (Object.keys(STAGE_PERCENT) as RewardStage[]).reduce(
    (sum, stage) => sum + getStageRequesterPoints(rewardPoints, stage),
    0,
  );
}

export function getRemainingRequesterPipeline(
  rewardPoints: number,
  rewardStagesApplied: string[] = [],
): number {
  if (!isRewardPointsEnabled()) return 0;
  const applied = new Set(rewardStagesApplied);
  return FUTURE_STAGES.reduce(
    (sum, stage) => sum + (applied.has(stage) ? 0 : getStageRequesterPoints(rewardPoints, stage)),
    0,
  );
}

export function getPublicRewardsConfig() {
  return {
    pointsEnabled: isRewardPointsEnabled(),
    stages: STAGE_PERCENT,
    totalRequesterPercent: (Object.keys(STAGE_PERCENT) as RewardStage[]).reduce(
      (sum, s) => sum + STAGE_PERCENT[s].deduct,
      0,
    ),
  };
}

export function buildPipelineBreakdown(rewardPoints: number) {
  return (Object.keys(STAGE_PERCENT) as RewardStage[]).map((stage) => ({
    stage,
    deductPct: STAGE_PERCENT[stage].deduct,
    creditPct: STAGE_PERCENT[stage].credit,
    deductPoints: getStageRequesterPoints(rewardPoints, stage),
    creditPoints: getStageReferrerPoints(rewardPoints, stage),
  }));
}
