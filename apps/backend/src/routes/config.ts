import { Router, type IRouter } from "express";
import { buildPipelineBreakdown, getPublicRewardsConfig } from "../lib/reward-schedule";

const router: IRouter = Router();

router.get("/config/rewards", (_req, res): void => {
  res.json(getPublicRewardsConfig());
});

/** Preview point costs for a job reward budget (e.g. rewardPoints=200) */
router.get("/config/rewards/preview/:rewardPoints", (req, res): void => {
  const raw = Array.isArray(req.params.rewardPoints)
    ? req.params.rewardPoints[0]
    : req.params.rewardPoints;
  const rewardPoints = Math.max(0, Number(raw));
  if (!Number.isFinite(rewardPoints)) {
    res.status(400).json({ error: "Invalid rewardPoints" });
    return;
  }
  res.json({
    ...getPublicRewardsConfig(),
    rewardPoints,
    pipeline: buildPipelineBreakdown(rewardPoints),
    totalRequesterCost: buildPipelineBreakdown(rewardPoints).reduce(
      (s, x) => s + x.deductPoints,
      0,
    ),
  });
});

export default router;
