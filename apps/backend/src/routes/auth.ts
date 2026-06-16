import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  UserModel,
  getNextSequence,
  toUserProfile,
} from "@workspace/db";
import { signToken } from "../lib/jwt";
import { REWARD_CONFIG } from "../lib/rewards";
import { saveAvatarImage } from "../lib/uploads";

const router: IRouter = Router();

const SignUpBody = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    memberType: z.enum(["student", "alumni"], {
      errorMap: () => ({ message: "Select Student or Alumni" }),
    }),
    isWorkingProfessional: z.boolean(),
    company: z.string().optional(),
    currentRole: z.string().optional(),
    experienceYears: z.coerce.number().min(0).max(50).optional(),
    isConsultant: z.boolean(),
    avatarData: z.string().min(1).optional(),
    avatarMimeType: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasAvatarData = Boolean(data.avatarData?.trim());
    const hasAvatarMime = Boolean(data.avatarMimeType?.trim());
    if (hasAvatarData !== hasAvatarMime) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid profile photo upload",
        path: ["avatarData"],
      });
    }
    if (data.isWorkingProfessional) {
      if (!data.company?.trim()) {
        ctx.addIssue({ code: "custom", message: "Organization name is required", path: ["company"] });
      }
      if (!data.currentRole?.trim()) {
        ctx.addIssue({ code: "custom", message: "Role is required", path: ["currentRole"] });
      }
      if (data.experienceYears == null) {
        ctx.addIssue({ code: "custom", message: "Total experience is required", path: ["experienceYears"] });
      }
    }
  });

const SignInBody = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

router.post("/auth/signup", async (req, res): Promise<void> => {
  try {
    const parsed = SignUpBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }

    const {
      fullName,
      email,
      password,
      memberType,
      isWorkingProfessional,
      isConsultant,
      company,
      currentRole,
      experienceYears,
      avatarData,
      avatarMimeType,
    } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    let avatarUrl: string | null = null;
    if (avatarData?.trim() && avatarMimeType?.trim()) {
      try {
        avatarUrl = saveAvatarImage(avatarData.trim(), avatarMimeType.trim()).url;
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : "Invalid profile photo",
        });
        return;
      }
    }

    const existing = await UserModel.findOne({ email: normalizedEmail }).select("+passwordHash");
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = await getNextSequence("user");

    const user = await UserModel.create({
      id,
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      totalPoints: REWARD_CONFIG.initialUserPoints,
      memberType,
      isWorkingProfessional,
      isConsultant,
      company: isWorkingProfessional ? company?.trim() : null,
      currentRole: isWorkingProfessional ? currentRole?.trim() : null,
      experienceYears: isWorkingProfessional ? experienceYears : null,
      avatarUrl,
    });

    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: toUserProfile(user.toObject()),
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const parsed = SignInBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await UserModel.findOne({ email: normalizedEmail }).select("+passwordHash");
    if (!user?.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user.id);
    const profile = toUserProfile(user.toObject());
    res.json({ token, user: profile });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to sign in. Please try again." });
  }
});

export default router;
