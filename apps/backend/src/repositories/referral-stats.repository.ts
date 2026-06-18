import {
  ReferralModel,
  CompanyReferralRequestModel,
  UserModel,
  toUserProfile,
  publiclyVisibleUserFilter,
} from "@workspace/db";

const REFERRED_STATUSES = [
  "referred",
  "interviewing",
  "hired",
  "rejected_after_interview",
] as const;

const INTERVIEW_STATUSES = ["interviewing", "hired", "rejected_after_interview"] as const;

export type ReferralStatsRow = {
  referralsGiven: number;
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

function roundRate(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeCompanyStatus(status: string): string {
  if (status === "declined" || status === "closed") return "rejected";
  return status;
}

function buildStatsFromCounts(counts: {
  total: number;
  jobRequestsReceived: number;
  companyRequestsReceived: number;
  pending: number;
  completed: number;
  accepted: number;
  rejected: number;
  referred: number;
  interviews: number;
  hires: number;
}): ReferralStatsRow {
  const {
    total,
    jobRequestsReceived,
    companyRequestsReceived,
    pending,
    completed,
    accepted,
    rejected,
    referred,
    interviews,
    hires,
  } = counts;
  const positiveOutcomes = Math.max(0, total - pending - rejected);
  return {
    referralsGiven: total,
    jobRequestsReceived,
    companyRequestsReceived,
    pending,
    completed,
    accepted,
    rejected,
    referred,
    interviews,
    hires,
    acceptanceRate: total > 0 ? roundRate((positiveOutcomes / total) * 100) : 0,
    hireRate: total > 0 ? roundRate((hires / total) * 100) : 0,
  };
}

async function countJobStats(referrerId: number) {
  const [total, pending, accepted, rejected, referred, interviews, hires] = await Promise.all([
    ReferralModel.countDocuments({ referrerId }),
    ReferralModel.countDocuments({ referrerId, status: "pending" }),
    ReferralModel.countDocuments({ referrerId, status: "accepted" }),
    ReferralModel.countDocuments({ referrerId, status: "rejected" }),
    ReferralModel.countDocuments({ referrerId, status: { $in: REFERRED_STATUSES } }),
    ReferralModel.countDocuments({ referrerId, status: { $in: INTERVIEW_STATUSES } }),
    ReferralModel.countDocuments({ referrerId, status: "hired" }),
  ]);

  return { total, pending, accepted, rejected, referred, interviews, hires };
}

async function countCompanyStats(referrerId: number) {
  const docs = await CompanyReferralRequestModel.find({ referrerIds: referrerId })
    .select("status acceptedByReferrerId rejectedReferrerIds")
    .lean();

  let pending = 0;
  let accepted = 0;
  let rejected = 0;
  let referred = 0;
  let interviews = 0;
  let hires = 0;

  for (const doc of docs) {
    const personallyRejected = doc.rejectedReferrerIds?.includes(referrerId) ?? false;
    const isHandler = doc.acceptedByReferrerId === referrerId;
    const status = normalizeCompanyStatus(doc.status ?? "pending");

    if (!doc.acceptedByReferrerId && !personallyRejected) {
      pending += 1;
    }

    if (personallyRejected && !isHandler) {
      rejected += 1;
    }

    if (isHandler) {
      if (status === "accepted") accepted += 1;
      if (REFERRED_STATUSES.includes(status as (typeof REFERRED_STATUSES)[number])) referred += 1;
      if (INTERVIEW_STATUSES.includes(status as (typeof INTERVIEW_STATUSES)[number])) interviews += 1;
      if (status === "hired") hires += 1;
      if (status === "rejected" || status === "rejected_after_interview") rejected += 1;
    }
  }

  return {
    total: docs.length,
    pending,
    accepted,
    rejected,
    referred,
    interviews,
    hires,
  };
}

export const referralStatsRepository = {
  async getStatsForReferrer(referrerId: number): Promise<ReferralStatsRow> {
    const [job, company] = await Promise.all([
      countJobStats(referrerId),
      countCompanyStats(referrerId),
    ]);

    return buildStatsFromCounts({
      total: job.total + company.total,
      jobRequestsReceived: job.total,
      companyRequestsReceived: company.total,
      pending: job.pending + company.pending,
      completed: job.hires + company.hires,
      accepted: job.accepted + company.accepted,
      rejected: job.rejected + company.rejected,
      referred: job.referred + company.referred,
      interviews: job.interviews + company.interviews,
      hires: job.hires + company.hires,
    });
  },

  async getTopAlumni(limit: number, sortBy: "hires" | "interviews" | "acceptanceRate") {
    const pipeline = [
      {
        $group: {
          _id: "$referrerId",
          referralsGiven: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          accepted: {
            $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] },
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
                $multiply: [
                  {
                    $divide: [
                      { $add: ["$accepted", "$referred", "$interviews", "$hires"] },
                      "$referralsGiven",
                    ],
                  },
                  100,
                ],
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
      ...publiclyVisibleUserFilter,
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
            jobRequestsReceived: row.referralsGiven as number,
            companyRequestsReceived: 0,
            pending: row.pending as number,
            completed: row.hires as number,
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
