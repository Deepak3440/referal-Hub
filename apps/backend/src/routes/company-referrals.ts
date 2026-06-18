import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { saveResumeDocument } from "../lib/uploads";
import {
  createCompanyReferralRequest,
  listCompanyReferrers,
  listCompanyReferralRequestsForRequester,
  listCompanyReferralRequestsForReferrer,
  updateCompanyReferralStatus,
} from "../services/company-referral";
import { ReferralRewardError } from "../services/referralRewards";
import type { ReferralStatus } from "../lib/rewards";

const router: IRouter = Router();

router.get("/companies/referrers", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const items = await listCompanyReferrers(search, user.id);
  res.json({ items, total: items.length });
});

router.get("/company-referral-requests", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const items = await listCompanyReferralRequestsForRequester(user.id);
  res.json({ items, total: items.length });
});

router.get("/company-referral-requests/incoming", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const items = await listCompanyReferralRequestsForReferrer(user.id);
  res.json({ items, total: items.length });
});

router.post("/company-referral-requests/resume", requireAuth, async (req, res): Promise<void> => {
  const data = req.body?.data;
  const mimeType = req.body?.mimeType;
  if (typeof data !== "string" || typeof mimeType !== "string") {
    res.status(400).json({ error: "data and mimeType are required" });
    return;
  }
  try {
    const saved = saveResumeDocument(data, mimeType);
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
  }
});

router.post("/company-referral-requests", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number; fullName: string } }).currentUser;
  const company = typeof req.body?.company === "string" ? req.body.company.trim() : "";
  const roleTitle = typeof req.body?.roleTitle === "string" ? req.body.roleTitle.trim() : "";
  const jobUrl = typeof req.body?.jobUrl === "string" ? req.body.jobUrl.trim() : "";
  const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
  const resumeUrl =
    typeof req.body?.resumeUrl === "string" && req.body.resumeUrl.trim()
      ? req.body.resumeUrl.trim()
      : null;

  if (!company) {
    res.status(400).json({ error: "company is required" });
    return;
  }
  if (!roleTitle) {
    res.status(400).json({ error: "roleTitle is required" });
    return;
  }
  if (!jobUrl) {
    res.status(400).json({ error: "jobUrl is required" });
    return;
  }
  if (!note) {
    res.status(400).json({ error: "note is required" });
    return;
  }

  try {
    new URL(jobUrl.startsWith("http") ? jobUrl : `https://${jobUrl}`);
  } catch {
    res.status(400).json({ error: "Enter a valid job posting URL" });
    return;
  }

  try {
    const created = await createCompanyReferralRequest({
      requesterId: user.id,
      requesterName: user.fullName,
      company,
      roleTitle,
      jobUrl: jobUrl.startsWith("http") ? jobUrl : `https://${jobUrl}`,
      note,
      resumeUrl,
    });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ReferralRewardError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json({
      error: err instanceof Error ? err.message : "Failed to send company referral request",
    });
  }
});

router.patch("/company-referral-requests/:id/status", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const requestId = parseInt(String(req.params.id), 10);
  const nextStatus = req.body?.status as ReferralStatus | undefined;

  if (Number.isNaN(requestId)) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }
  if (!nextStatus || typeof nextStatus !== "string") {
    res.status(400).json({ error: "status is required" });
    return;
  }

  try {
    const updated = await updateCompanyReferralStatus({
      requestId,
      referrerId: user.id,
      nextStatus,
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof ReferralRewardError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json({
      error: err instanceof Error ? err.message : "Failed to update company referral request",
    });
  }
});

router.patch("/company-referral-requests/:id/respond", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const requestId = parseInt(String(req.params.id), 10);
  const action = req.body?.action;

  if (Number.isNaN(requestId)) {
    res.status(400).json({ error: "Invalid request id" });
    return;
  }
  if (action !== "accept" && action !== "reject") {
    res.status(400).json({ error: 'action must be "accept" or "reject"' });
    return;
  }

  try {
    const updated = await updateCompanyReferralStatus({
      requestId,
      referrerId: user.id,
      nextStatus: action === "accept" ? "accepted" : "rejected",
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof ReferralRewardError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json({
      error: err instanceof Error ? err.message : "Failed to update company referral request",
    });
  }
});

export default router;
