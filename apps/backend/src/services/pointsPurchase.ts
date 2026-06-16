import { UserModel } from "@workspace/db";

/** Tier config — bigger packs can set bonusPercent for extra points (volume discount). */
export type PointsPackageTier = {
  id: string;
  label: string;
  /** Base points shown on the pack */
  points: number;
  priceInr: number;
  /** Extra % points credited on top (e.g. 30 → 2000 base becomes 2600 total) */
  bonusPercent?: number;
  popular?: boolean;
};

export type EnrichedPointsPackage = PointsPackageTier & {
  bonusPoints: number;
  /** Actual points credited after bonus */
  totalPoints: number;
  /** Extra value vs the smallest tier (pts per ₹) */
  valueBonusPercent: number;
};

/** Default: 3 tiers — bigger pack = more bonus points */
const DEFAULT_TIERS: PointsPackageTier[] = [
  { id: "starter", label: "Starter", points: 100, priceInr: 99, bonusPercent: 0 },
  { id: "growth", label: "Growth", points: 500, priceInr: 399, bonusPercent: 15, popular: true },
  { id: "pro", label: "Pro", points: 2000, priceInr: 1299, bonusPercent: 30 },
];

function normalizeTier(raw: unknown): PointsPackageTier | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const id = typeof p.id === "string" ? p.id.trim() : "";
  const label = typeof p.label === "string" ? p.label.trim() : "";
  const points = Number(p.points);
  const priceInr = Number(p.priceInr);
  const bonusPercent = p.bonusPercent != null ? Number(p.bonusPercent) : 0;
  if (!id || !label || !Number.isFinite(points) || points <= 0) return null;
  if (!Number.isFinite(priceInr) || priceInr < 0) return null;
  return {
    id,
    label,
    points: Math.round(points),
    priceInr: Math.round(priceInr),
    bonusPercent: Number.isFinite(bonusPercent) && bonusPercent > 0 ? Math.round(bonusPercent) : 0,
    popular: p.popular === true,
  };
}

function tiersFromEnv(): PointsPackageTier[] | null {
  const raw = process.env.POINTS_PURCHASE_PACKAGES;
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const tiers = parsed.map(normalizeTier).filter((t): t is PointsPackageTier => t != null);
    return tiers.length > 0 ? tiers : null;
  } catch {
    return null;
  }
}

export function getPointTiers(): PointsPackageTier[] {
  return tiersFromEnv() ?? DEFAULT_TIERS;
}

export function computeBonusPoints(points: number, bonusPercent = 0): number {
  if (bonusPercent <= 0) return 0;
  return Math.round((points * bonusPercent) / 100);
}

export function computeTotalPoints(points: number, bonusPercent = 0): number {
  return points + computeBonusPoints(points, bonusPercent);
}

/** Enrich tiers with bonus + value vs base tier for UI */
export function enrichPointPackages(tiers: PointsPackageTier[]): EnrichedPointsPackage[] {
  const sorted = [...tiers].sort((a, b) => a.points - b.points);
  const base = sorted[0];
  const baseRate = base ? base.points / base.priceInr : 0;

  return tiers.map((tier) => {
    const bonusPercent = tier.bonusPercent ?? 0;
    const bonusPoints = computeBonusPoints(tier.points, bonusPercent);
    const totalPoints = tier.points + bonusPoints;
    const tierRate = totalPoints / tier.priceInr;
    const valueBonusPercent =
      baseRate > 0 ? Math.max(0, Math.round((tierRate / baseRate - 1) * 100)) : 0;

    return {
      ...tier,
      bonusPoints,
      totalPoints,
      valueBonusPercent,
    };
  });
}

export function getEnrichedPackages(): EnrichedPointsPackage[] {
  return enrichPointPackages(getPointTiers());
}

export function isPointsPurchaseEnabled(): boolean {
  return process.env.POINTS_PURCHASE_ENABLED !== "false";
}

export function listPointPackages() {
  const enabled = isPointsPurchaseEnabled();
  return {
    enabled,
    mode: "simulated" as const,
    packages: enabled ? getEnrichedPackages() : [],
  };
}

export function getPackageById(packageId: string): EnrichedPointsPackage | undefined {
  return getEnrichedPackages().find((p) => p.id === packageId);
}

export type PurchasePointsResult = {
  packageId: string;
  basePoints: number;
  bonusPoints: number;
  pointsAdded: number;
  bonusPercent: number;
  priceInr: number;
  paymentStatus: "simulated";
  paymentRef: string;
  totalPoints: number;
};

export async function purchasePoints(
  userId: number,
  packageId: string,
): Promise<PurchasePointsResult> {
  if (!isPointsPurchaseEnabled()) {
    throw new Error("Point purchases are disabled in this environment");
  }

  const pkg = getPackageById(packageId);
  if (!pkg) {
    throw new Error("Invalid points package");
  }

  const paymentRef = `sim_${Date.now()}_${userId}`;
  const updated = await UserModel.findOneAndUpdate(
    { id: userId },
    { $inc: { totalPoints: pkg.totalPoints } },
    { new: true },
  ).lean();

  if (!updated) {
    throw new Error("User not found");
  }

  return {
    packageId: pkg.id,
    basePoints: pkg.points,
    bonusPoints: pkg.bonusPoints,
    pointsAdded: pkg.totalPoints,
    bonusPercent: pkg.bonusPercent ?? 0,
    priceInr: pkg.priceInr,
    paymentStatus: "simulated",
    paymentRef,
    totalPoints: updated.totalPoints ?? 0,
  };
}

export async function getUserPointsBalance(userId: number): Promise<number> {
  const user = await UserModel.findOne({ id: userId }).lean();
  return user?.totalPoints ?? 0;
}
