import { Router, type IRouter } from "express";
import { z } from "zod";
import { UserModel, toUserProfile } from "@workspace/db";
import { findPublicUserById, toPublicUserProfile } from "../lib/public-user";
import { requireAuth } from "../middlewares/auth";
import { UpdateMeBody } from "@workspace/api-zod";
import { saveAvatarImage } from "../lib/uploads";
import {
  listPointPackages,
  purchasePoints,
} from "../services/pointsPurchase";
import { deleteUserAccount } from "../services/deleteAccount";

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
  mentorshipDurationMinutes: z.coerce.number().int().min(15).max(120).optional().nullable(),
  mentorshipPriceInr: z.coerce.number().int().min(0).optional().nullable(),
  workExperiences: z.array(workExperienceZ).optional(),
  projects: z.array(projectZ).optional(),
  education: z.array(educationZ).optional(),
  researchPapers: z.array(researchPaperZ).optional(),
  certifications: z.array(certificationZ).optional(),
  avatarData: z.string().min(1).optional(),
  avatarMimeType: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
  const hasAvatarData = Boolean(data.avatarData?.trim());
  const hasAvatarMime = Boolean(data.avatarMimeType?.trim());
  if (hasAvatarData !== hasAvatarMime) {
    ctx.addIssue({
      code: "custom",
      message: "Invalid profile photo upload",
      path: ["avatarData"],
    });
  }
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

const UploadAvatarBody = z.object({
  data: z.string().min(1),
  mimeType: z.string().min(1),
});

router.post("/users/me/avatar", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const parsed = UploadAvatarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid upload" });
    return;
  }

  try {
    const { url } = saveAvatarImage(parsed.data.data, parsed.data.mimeType);
    const updated = await UserModel.findOneAndUpdate(
      { id: user.id },
      { avatarUrl: url },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(toUserProfile(updated));
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Profile photo upload failed",
    });
  }
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

  const updateFields: Record<string, unknown> = { ...data };
  delete updateFields.avatarData;
  delete updateFields.avatarMimeType;

  if (parsed.data.avatarData?.trim() && parsed.data.avatarMimeType?.trim()) {
    try {
      updateFields.avatarUrl = saveAvatarImage(
        parsed.data.avatarData.trim(),
        parsed.data.avatarMimeType.trim(),
      ).url;
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Invalid profile photo",
      });
      return;
    }
  }

  const updated = await UserModel.findOneAndUpdate(
    { id: user.id },
    {
      ...updateFields,
      // Once complete, stay complete — editing must not trap users on onboarding
      isProfileComplete: user.isProfileComplete || Boolean(hasAllRequired),
      resumeScore,
    },
    { new: true },
  ).lean();

  res.json(toUserProfile(updated));
});

const DeleteAccountBody = z.object({
  confirmEmail: z.string().email(),
});

router.delete("/users/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number; email: string } }).currentUser;
  const parsed = DeleteAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter your email address to confirm deletion." });
    return;
  }

  if (parsed.data.confirmEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    res.status(400).json({ error: "Email does not match your account." });
    return;
  }

  try {
    await deleteUserAccount(user.id);
    res.status(204).send();
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account. Please try again." });
  }
});

router.get("/users/:userId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const user = await findPublicUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(toPublicUserProfile(user));
});

export default router;
