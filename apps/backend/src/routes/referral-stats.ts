import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { referralStatsController } from "../controllers/referral-stats.controller";

const router: IRouter = Router();

router.get("/leaderboard/top-alumni", requireAuth, referralStatsController.getLeaderboard);
router.get("/users/:userId/referral-stats", requireAuth, referralStatsController.getUserStats);

export default router;
