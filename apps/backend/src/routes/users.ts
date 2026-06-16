import { Router, type IRouter } from "express";
import { z } from "zod";
import { UserModel, toUserProfile } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { UpdateMeBody } from "@workspace/api-zod";
import {
  listPointPackages,
  purchasePoints,
} from "../services/pointsPurchase";

const workExperienceZ = z.object({
  company: z.string().min(1),
  role: z.string().optional(),
  fromYear: z.string().optional(),
  toYear: z.string().optional(),
  description: z.string().optional(),
});

const projectZ = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  technologies: z.string().optional(),
});

const educationZ = z.object({
  level: z.enum(["UG", "PG", "PhD"]),
  institution: z.string().min(1),
  stream: z.string().optional(),
  batchYear: z.coerce.number().optional(),
});

const researchPaperZ = z.object({
  title: z.string().min(1),
  publication: z.string().optional(),
  year: z.coerce.number().optional(),
  link: z.string().optional(),
});

const certificationZ = z.object({
  name: z.string().min(1),
  issuer: z.string().optional(),
  year: z.coerce.number().optional(),
});

const ExtendedUpdateMeBody = UpdateMeBody.extend({
  isWorkingProfessional: z.boolean().optional(),
  isConsultant: z.boolean().optional(),
  workExperiences: z.array(workExperienceZ).optional(),
  projects: z.array(projectZ).optional(),
  education: z.array(educationZ).optional(),
  researchPapers: z.array(researchPaperZ).optional(),
  certifications: z.array(certificationZ).optional(),
});

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  res.json(user);
});

router.get("/users/me/points/packages", requireAuth, (_req, res): void => {
  res.json(listPointPackages());
});

const PurchasePointsBody = z.object({
  packageId: z.string().min(1),
});

router.post("/users/me/points/purchase", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const parsed = PurchasePointsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await purchasePoints(user.id, parsed.data.packageId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Purchase failed";
    const status = message.includes("disabled") || message.includes("Invalid") ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

router.put("/users/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const parsed = ExtendedUpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data as Record<string, unknown>;
  const isWorkingProfessional =
    (data.isWorkingProfessional as boolean | undefined) ?? user.isWorkingProfessional ?? false;

  const merged = {
    fullName: (data.fullName as string | undefined) ?? user.fullName,
    headline: (data.headline as string | undefined) ?? user.headline,
    company: (data.company as string | undefined) ?? user.company,
    currentRole: (data.currentRole as string | undefined) ?? user.currentRole,
    experienceYears:
      (data.experienceYears as number | undefined) ?? user.experienceYears,
    skills: (data.skills as string[] | undefined) ?? user.skills,
  };

  const hasAllRequired = isWorkingProfessional
    ? Boolean(
        merged.fullName &&
          merged.headline &&
          merged.company &&
          merged.currentRole &&
          merged.experienceYears != null &&
          Array.isArray(merged.skills) &&
          merged.skills.length > 0,
      )
    : Boolean(
        merged.fullName &&
          merged.headline &&
          Array.isArray(merged.skills) &&
          merged.skills.length > 0,
      );

  let resumeScore = user.resumeScore;
  if (!resumeScore && hasAllRequired) {
    resumeScore = Math.floor(Math.random() * 20) + 70;
  }

  const updated = await UserModel.findOneAndUpdate(
    { id: user.id },
    {
      ...data,
      // Once complete, stay complete — editing must not trap users on onboarding
      isProfileComplete: user.isProfileComplete || Boolean(hasAllRequired),
      resumeScore,
    },
    { new: true },
  ).lean();

  res.json(toUserProfile(updated));
});

router.get("/users/:userId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const user = await UserModel.findOne({ id: parseInt(raw, 10) }).lean();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(toUserProfile(user));
});

export default router;
