import { ReferralModel, UserModel, toUserProfile } from "@workspace/db";

const ACCEPTED_STATUSES = [
  "accepted",
  "referred",
  "interviewing",
  "hired",
  "rejected_after_interview",
] as const;

const REFERRED_STATUSES = [
  "referred",
  "interviewing",
  "hired",
  "rejected_after_interview",
] as const;

const INTERVIEW_STATUSES = ["interviewing", "hired", "rejected_after_interview"] as const;

export type ReferralStatsRow = {
  referralsGiven: number;
  accepted: number;
  rejected: number;
  referred: number;
  interviews: number;
  hires: number;
  acceptanceRate: number;
  hireRate: number;
};

function roundRate(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildStatsFromCounts(counts: {
  total: number;
  accepted: number;
  rejected: number;
  referred: number;
  interviews: number;
  hires: number;
}): ReferralStatsRow {
  const { total, accepted, rejected, referred, interviews, hires } = counts;
  return {
    referralsGiven: total,
    accepted,
    rejected,
    referred,
    interviews,
    hires,
    acceptanceRate: total > 0 ? roundRate((accepted / total) * 100) : 0,
    hireRate: total > 0 ? roundRate((hires / total) * 100) : 0,
  };
}

export const referralStatsRepository = {
  async getStatsForReferrer(referrerId: number): Promise<ReferralStatsRow> {
    const [total, accepted, rejected, referred, interviews, hires] = await Promise.all([
      ReferralModel.countDocuments({ referrerId }),
      ReferralModel.countDocuments({ referrerId, status: { $in: ACCEPTED_STATUSES } }),
      ReferralModel.countDocuments({ referrerId, status: "rejected" }),
      ReferralModel.countDocuments({ referrerId, status: { $in: REFERRED_STATUSES } }),
      ReferralModel.countDocuments({ referrerId, status: { $in: INTERVIEW_STATUSES } }),
      ReferralModel.countDocuments({ referrerId, status: "hired" }),
    ]);

    return buildStatsFromCounts({ total, accepted, rejected, referred, interviews, hires });
  },

  async getTopAlumni(limit: number, sortBy: "hires" | "interviews" | "acceptanceRate") {
    const pipeline = [
      {
        $group: {
          _id: "$referrerId",
          referralsGiven: { $sum: 1 },
          accepted: {
            $sum: {
              $cond: [{ $in: ["$status", ACCEPTED_STATUSES] }, 1, 0],
            },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
          referred: {
            $sum: {
              $cond: [{ $in: ["$status", REFERRED_STATUSES] }, 1, 0],
            },
          },
          interviews: {
            $sum: {
              $cond: [{ $in: ["$status", INTERVIEW_STATUSES] }, 1, 0],
            },
          },
          hires: {
            $sum: { $cond: [{ $eq: ["$status", "hired"] }, 1, 0] },
          },
        },
      },
      {
        $addFields: {
          acceptanceRate: {
            $cond: [
              { $gt: ["$referralsGiven", 0] },
              {
                $multiply: [{ $divide: ["$accepted", "$referralsGiven"] }, 100],
              },
              0,
            ],
          },
          hireRate: {
            $cond: [
              { $gt: ["$referralsGiven", 0] },
              {
                $multiply: [{ $divide: ["$hires", "$referralsGiven"] }, 100],
              },
              0,
            ],
          },
        },
      },
      { $sort: { [sortBy]: -1, referralsGiven: -1 } },
      { $limit: limit },
    ];

    const aggregated = await ReferralModel.aggregate(pipeline);

    const alumniIds = aggregated.map((row) => row._id as number);
    const users = await UserModel.find({
      id: { $in: alumniIds },
      memberType: "alumni",
    }).lean();
    const userMap = new Map(users.map((u) => [u.id, u]));

    return aggregated
      .map((row) => {
        const user = userMap.get(row._id as number);
        if (!user) return null;
        return {
          user: toUserProfile(user),
          stats: buildStatsFromCounts({
            total: row.referralsGiven as number,
            accepted: row.accepted as number,
            rejected: row.rejected as number,
            referred: row.referred as number,
            interviews: row.interviews as number,
            hires: row.hires as number,
          }),
        };
      })
      .filter(Boolean);
  },
};
