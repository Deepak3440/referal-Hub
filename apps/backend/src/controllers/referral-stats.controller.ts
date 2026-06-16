import type { Request, Response } from "express";
import { referralStatsService } from "../services/referral-stats.service";

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : "Request failed";
  if (message === "User not found" || message === "Referral stats are only available for alumni") {
    res.status(404).json({ error: message });
    return;
  }
  res.status(400).json({ error: message });
}

export const referralStatsController = {
  async getUserStats(req: Request, res: Response): Promise<void> {
    const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const userId = parseInt(raw, 10);
    if (Number.isNaN(userId)) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }
    try {
      const stats = await referralStatsService.getUserReferralStats(userId);
      res.json(stats);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const items = await referralStatsService.getTopAlumniLeaderboard(
        req.query as Record<string, unknown>,
      );
      res.json({ items });
    } catch (err) {
      handleError(res, err);
    }
  },
};
