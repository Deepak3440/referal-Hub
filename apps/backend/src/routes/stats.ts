import { Router, type IRouter } from "express";
import { ReferralModel, JobModel, CompanyReferralRequestModel } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/stats/dashboard", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;

  const [
    jobsPosted,
    jobReferralsReceived,
    companyReferralsReceived,
    referralsSent,
    activeJobReferrals,
    activeCompanyReferrals,
    jobPending,
    companyPending,
    jobHires,
    companyHires,
  ] = await Promise.all([
    JobModel.countDocuments({ posterId: user.id }),
    ReferralModel.countDocuments({ referrerId: user.id }),
    CompanyReferralRequestModel.countDocuments({ referrerIds: user.id }),
    ReferralModel.countDocuments({ requesterId: user.id }),
    ReferralModel.countDocuments({
      referrerId: user.id,
      status: { $in: ["accepted", "referred", "interviewing"] },
    }),
    CompanyReferralRequestModel.countDocuments({
      acceptedByReferrerId: user.id,
      status: { $in: ["accepted", "referred", "interviewing"] },
    }),
    ReferralModel.countDocuments({ referrerId: user.id, status: "pending" }),
    CompanyReferralRequestModel.countDocuments({
      referrerIds: user.id,
      acceptedByReferrerId: null,
      rejectedReferrerIds: { $nin: [user.id] },
    }),
    ReferralModel.countDocuments({ referrerId: user.id, status: "hired" }),
    CompanyReferralRequestModel.countDocuments({
      acceptedByReferrerId: user.id,
      status: "hired",
    }),
  ]);

  res.json({
    totalJobsPosted: jobsPosted,
    activeReferrals: activeJobReferrals + activeCompanyReferrals,
    referralsGiven: jobReferralsReceived + companyReferralsReceived,
    referralsReceived: referralsSent,
    totalPointsEarned: user.totalPoints,
    successfulHires: jobHires + companyHires,
    pendingReferrals: jobPending + companyPending,
  });
});

export default router;
