import type { UserProfile } from "@workspace/api-client-react";
import { httpRequest } from "@/lib/http-client";

export type ReferralStats = {
  userId: number;
  memberType: string;
  referralsGiven: number;
  referralsReceived: number;
  jobRequestsReceived: number;
  companyRequestsReceived: number;
  pending: number;
  completed: number;
  accepted: number;
  rejected: number;
  referred: number;
  interviews: number;
  hires: number;
  acceptanceRate: number;
  hireRate: number;
};

export type LeaderboardEntry = {
  user: UserProfile;
  stats: Omit<ReferralStats, "userId" | "memberType" | "referralsReceived">;
};

export const referralStatsApi = {
  getUserStats: (userId: number) =>
    httpRequest<ReferralStats>(`/users/${userId}/referral-stats`),
  getTopAlumni: (sortBy: "hires" | "interviews" | "acceptanceRate" = "hires", limit = 10) =>
    httpRequest<{ items: LeaderboardEntry[] }>(
      `/leaderboard/top-alumni?sortBy=${sortBy}&limit=${limit}`,
    ),
};

export const REFERRAL_STATS_QUERY_KEYS = {
  user: (userId: number) => ["/api/users", userId, "referral-stats"] as const,
  leaderboard: (sortBy: string) => ["/api/leaderboard/top-alumni", { sortBy }] as const,
};
