import { Router, type IRouter } from "express";
import { z } from "zod";
import { toConsultation, type ConsultationDoc } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireAdmin } from "../middlewares/admin";
import { findPublicUserById, toPublicUserProfile } from "../lib/public-user";
import { listOpenDisputes, resolveSessionDispute } from "../services/mentorship-dispute";

const router: IRouter = Router();

const ResolveBody = z.object({
  resolution: z.enum(["refund", "mentor", "dismiss"]),
  adminNote: z.string().max(1000).optional(),
});

async function enrichDispute(doc: ConsultationDoc) {
  const [requester, consultant] = await Promise.all([
    findPublicUserById(doc.requesterId),
    findPublicUserById(doc.consultantId),
  ]);
  return {
    ...toConsultation(doc),
    requester: toPublicUserProfile(requester),
    consultant: toPublicUserProfile(consultant),
  };
}

router.get("/admin/mentorship/disputes", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await listOpenDisputes();
  res.json(await Promise.all(rows.map(enrichDispute)));
});

router.patch(
  "/admin/mentorship/disputes/:consultationId",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.consultationId)
      ? req.params.consultationId[0]
      : req.params.consultationId;
    const id = parseInt(raw, 10);
    const parsed = ResolveBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }

    try {
      await resolveSessionDispute(id, parsed.data.resolution, parsed.data.adminNote);
      const updated = await listOpenDisputes();
      res.json({
        ok: true,
        openCount: updated.length,
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Could not resolve dispute" });
    }
  },
);

export default router;
