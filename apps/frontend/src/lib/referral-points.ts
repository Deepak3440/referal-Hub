/**
 * % of job.rewardPoints per stage — keep in sync with apps/backend/src/lib/reward-schedule.ts
 * Override via server env; frontend uses /api/config/rewards when loaded.
 */
export type RewardStage = "request" | "accepted" | "referred" | "hired";

export const DEFAULT_STAGE_PERCENT: Record<RewardStage, { deduct: number; credit: number }> = {
  request: { deduct: 10, credit: 10 },
  accepted: { deduct: 10, credit: 20 },
  referred: { deduct: 30, credit: 30 },
  hired: { deduct: 50, credit: 50 },
};

const STAGE_LABELS: Record<RewardStage, string> = {
  request: "Send request",
  accepted: "Accepted",
  referred: "Referred",
  hired: "Hired",
};

const FUTURE_STAGES: RewardStage[] = ["accepted", "referred", "hired"];

export type RewardsConfig = {
  pointsEnabled: boolean;
  stages: Record<RewardStage, { deduct: number; credit: number }>;
  totalRequesterPercent: number;
};

let cachedConfig: RewardsConfig | null = null;

export function setRewardsConfig(config: RewardsConfig | null) {
  cachedConfig = config;
}

function activeStages() {
  return cachedConfig?.stages ?? DEFAULT_STAGE_PERCENT;
}

export function isPointsEnabledClient(): boolean {
  return cachedConfig?.pointsEnabled ?? true;
}

function roundPts(value: number): number {
  return Math.max(0, Math.round(value));
}

function ptsFromPercent(rewardPoints: number, percent: number): number {
  if (rewardPoints <= 0 || percent <= 0) return 0;
  return roundPts((rewardPoints * percent) / 100);
}

export function getStageRequesterCost(rewardPoints: number, stage: RewardStage): number {
  if (!isPointsEnabledClient()) return 0;
  return ptsFromPercent(rewardPoints, activeStages()[stage].deduct);
}

export function getTotalPipelineCost(rewardPoints: number): number {
  if (!isPointsEnabledClient()) return 0;
  return (Object.keys(activeStages()) as RewardStage[]).reduce(
    (sum, stage) => sum + getStageRequesterCost(rewardPoints, stage),
    0,
  );
}

export function getRemainingPipelineCost(
  rewardPoints: number,
  rewardStagesApplied: string[] = [],
): number {
  if (!isPointsEnabledClient()) return 0;
  const applied = new Set(rewardStagesApplied);
  return FUTURE_STAGES.reduce(
    (sum, stage) => sum + (applied.has(stage) ? 0 : getStageRequesterCost(rewardPoints, stage)),
    0,
  );
}

export function buildPipelineBreakdown(rewardPoints: number) {
  return (Object.keys(activeStages()) as RewardStage[]).map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    deductPct: activeStages()[stage].deduct,
    deductPoints: getStageRequesterCost(rewardPoints, stage),
  }));
}

export function isActiveReferralStatus(status: string): boolean {
  return ["pending", "accepted", "referred", "interviewing"].includes(status);
}

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

export function computeReferralPointsSnapshot(
  availablePoints: number,
  activeReferrals: ActiveReferralPoints[],
  newJobRewardPoints: number,
): ReferralPointsSnapshot {
  if (!isPointsEnabledClient()) {
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
    (sum, r) => sum + getRemainingPipelineCost(r.rewardPoints, r.rewardStagesApplied ?? []),
    0,
  );
  const newRequestPipeline = getTotalPipelineCost(newJobRewardPoints);
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

export function getStageReferrerCredit(rewardPoints: number, stage: RewardStage): number {
  if (!isPointsEnabledClient()) return 0;
  return ptsFromPercent(rewardPoints, activeStages()[stage].credit);
}

export function formatStageTransferPoster(rewardPoints: number, stage: RewardStage): string {
  if (!isPointsEnabledClient()) return "";
  const deduct = getStageRequesterCost(rewardPoints, stage);
  const credit = getStageReferrerCredit(rewardPoints, stage);
  return `−${deduct} from requester · +${credit} to you`;
}

export function formatStageTransferPosterToast(rewardPoints: number, stage: RewardStage): string {
  if (!isPointsEnabledClient()) return "";
  const deduct = getStageRequesterCost(rewardPoints, stage);
  const credit = getStageReferrerCredit(rewardPoints, stage);
  return `+${credit} pts added to you · −${deduct} from requester`;
}

export function formatStageTransferRequester(rewardPoints: number, stage: RewardStage): string {
  if (!isPointsEnabledClient()) return "";
  const deduct = getStageRequesterCost(rewardPoints, stage);
  const credit = getStageReferrerCredit(rewardPoints, stage);
  return `−${deduct} pts from you · +${credit} to poster`;
}

export function formatPipelineSummary(rewardPoints: number): string {
  if (!isPointsEnabledClient() || rewardPoints <= 0) return "";
  return buildPipelineBreakdown(rewardPoints)
    .map((r) => {
      const credit = getStageReferrerCredit(rewardPoints, r.stage);
      return `${r.label.toLowerCase()} (−${r.deductPoints} you, +${credit} poster)`;
    })
    .join(" → ");
}

export function rewardStageForPosterAction(status: string): RewardStage | null {
  if (status === "pending") return "accepted";
  if (status === "accepted") return "referred";
  if (status === "interviewing") return "hired";
  return null;
}

export function rewardStageForRequesterStatus(status: string): RewardStage | null {
  if (status === "pending") return "request";
  if (status === "accepted") return "accepted";
  if (status === "referred") return "referred";
  if (status === "hired") return "hired";
  return null;
}

export function rewardStageForStatusUpdate(status: string): RewardStage | null {
  if (status === "accepted") return "accepted";
  if (status === "referred") return "referred";
  if (status === "hired") return "hired";
  return null;
}

export function referralPointsHint(snapshot: ReferralPointsSnapshot): string {
  if (!snapshot.pointsEnabled) {
    return "Points are off in this environment — referrals work without deductions.";
  }
  if (snapshot.canSend) {
    return `${snapshot.newRequestPipeline} pts needed for the full path on this ${snapshot.jobRewardPoints} pt opening. Your balance: ${snapshot.availablePoints} pts.`;
  }
  if (snapshot.reservedForActive > 0) {
    return `Need ${snapshot.requiredToSend} pts (${snapshot.newRequestPipeline} for this ${snapshot.jobRewardPoints} pt job + ${snapshot.reservedForActive} reserved). You have ${snapshot.availablePoints} pts — earn ${snapshot.shortfall} more.`;
  }
  return `Need ${snapshot.requiredToSend} pts for this ${snapshot.jobRewardPoints} pt opening. You have ${snapshot.availablePoints} pts — earn ${snapshot.shortfall} more.`;
}
