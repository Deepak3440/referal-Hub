import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import jobsRouter from "./jobs";
import referralsRouter from "./referrals";
import messagesRouter from "./messages";
import statsRouter from "./stats";
import consultationsRouter from "./consultations";
import postsRouter from "./posts";
import notificationsRouter from "./notifications";
import referralStatsRouter from "./referral-stats";
import configRouter from "./config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(authRouter);
router.use(referralStatsRouter);
router.use(usersRouter);
router.use(jobsRouter);
router.use(referralsRouter);
router.use(messagesRouter);
router.use(statsRouter);
router.use(consultationsRouter);
router.use(postsRouter);
router.use(notificationsRouter);

export default router;
