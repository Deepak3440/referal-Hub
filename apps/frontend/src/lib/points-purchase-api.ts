import { httpRequest } from "@/lib/http-client";

export type PointsPackage = {
  id: string;
  label: string;
  points: number;
  priceInr: number;
  bonusPercent?: number;
  bonusPoints: number;
  totalPoints: number;
  valueBonusPercent: number;
  popular?: boolean;
};

export type PointsPackagesResponse = {
  enabled: boolean;
  mode: "simulated";
  packages: PointsPackage[];
};

export type PurchasePointsResponse = {
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

export const pointsPurchaseApi = {
  getPackages: () => httpRequest<PointsPackagesResponse>("/users/me/points/packages"),
  purchase: (packageId: string) =>
    httpRequest<PurchasePointsResponse>("/users/me/points/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    }),
};

export const POINTS_PURCHASE_QUERY_KEY = ["/api/users/me/points/packages"] as const;
