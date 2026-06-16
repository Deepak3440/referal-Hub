import { Router, type IRouter } from "express";
import { ReferralModel, JobModel } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/stats/dashboard", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;

  const [
    jobsPosted,
    referralsGiven,
    referralsReceived,
    activeReferrals,
    pendingReferrals,
    successfulHires,
  ] = await Promise.all([
    JobModel.countDocuments({ posterId: user.id }),
    ReferralModel.countDocuments({ referrerId: user.id }),
    ReferralModel.countDocuments({ requesterId: user.id }),
    ReferralModel.countDocuments({
      $or: [{ requesterId: user.id }, { referrerId: user.id }],
      status: { $in: ["accepted", "referred", "interviewing"] },
    }),
    ReferralModel.countDocuments({ referrerId: user.id, status: "pending" }),
    ReferralModel.countDocuments({ referrerId: user.id, status: "hired" }),
  ]);

  res.json({
    totalJobsPosted: jobsPosted,
    activeReferrals,
    referralsGiven,
    referralsReceived,
    totalPointsEarned: user.totalPoints,
    successfulHires,
    pendingReferrals,
  });
});

export default router;
