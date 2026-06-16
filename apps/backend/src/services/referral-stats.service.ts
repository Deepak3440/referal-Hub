import type { ReferralStatus } from "../lib/rewards";
import { STATUS_LABELS } from "../lib/rewards";
import { referralStatsRepository } from "../repositories/referral-stats.repository";
import { UserModel } from "@workspace/db";

const LeaderboardQuerySchema = {
  parse(query: Record<string, unknown>) {
    const limitRaw = typeof query.limit === "string" ? parseInt(query.limit, 10) : 10;
    const limit = Number.isNaN(limitRaw) ? 10 : Math.min(Math.max(limitRaw, 1), 50);
    const sortByRaw = typeof query.sortBy === "string" ? query.sortBy : "hires";
    const sortBy =
      sortByRaw === "interviews" || sortByRaw === "acceptanceRate" ? sortByRaw : "hires";
    return { limit, sortBy: sortBy as "hires" | "interviews" | "acceptanceRate" };
  },
};

export const referralStatsService = {
  async getUserReferralStats(userId: number) {
    const user = await UserModel.findOne({ id: userId }).lean();
    if (!user) throw new Error("User not found");
    if (user.memberType !== "alumni") {
      throw new Error("Referral stats are only available for alumni");
    }

    const stats = await referralStatsRepository.getStatsForReferrer(userId);
    return {
      userId,
      memberType: user.memberType ?? "student",
      ...stats,
      referralsReceived: stats.referralsGiven,
    };
  },

  getTopAlumniLeaderboard(query: Record<string, unknown>) {
    const { limit, sortBy } = LeaderboardQuerySchema.parse(query);
    return referralStatsRepository.getTopAlumni(limit, sortBy);
  },
};

export function referralStatusNotification(
  status: ReferralStatus,
): { type: "referral_accepted" | "referral_rejected" | "referral_status_changed"; title: string } {
  if (status === "accepted") {
    return { type: "referral_accepted", title: "Referral accepted" };
  }
  if (status === "rejected") {
    return { type: "referral_rejected", title: "Referral declined" };
  }
  return {
    type: "referral_status_changed",
    title: `Referral update: ${STATUS_LABELS[status]}`,
  };
}
