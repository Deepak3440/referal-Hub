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
import {
  createVerificationToken,
  getVerificationLink,
  isEmailVerificationEnabled,
} from "../lib/email-verification";
import { sendVerificationEmail } from "../services/email";
import {
  buildSignInRedirect,
  verifyEmailToken,
} from "../services/verify-email";
import {
  renderVerifyEmailError,
  renderVerifyEmailSuccess,
} from "../lib/verify-email-html";

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

const VerifyEmailBody = z.object({
  token: z.string().min(1, "Verification token is required"),
});

const ResendVerificationBody = z.object({
  email: z.string().email("Invalid email address"),
});

async function issueVerificationEmail(user: { email: string; fullName: string }, token: string) {
  await sendVerificationEmail({
    to: user.email,
    fullName: user.fullName,
    verifyUrl: getVerificationLink(token),
  });
}

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
    const verificationEnabled = isEmailVerificationEnabled();

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

    const existing = await UserModel.findOne({ email: normalizedEmail }).select(
      "+passwordHash +emailVerificationTokenHash",
    );
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = await getNextSequence("user");

    let verificationFields: Record<string, unknown> = {
      emailVerified: true,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    };
    let rawVerificationToken: string | null = null;

    if (verificationEnabled) {
      const { token, tokenHash, expiresAt } = createVerificationToken();
      rawVerificationToken = token;
      verificationFields = {
        emailVerified: false,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      };
    }

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
      ...verificationFields,
    });

    if (verificationEnabled && rawVerificationToken) {
      await issueVerificationEmail(user, rawVerificationToken);
      res.status(201).json({
        requiresVerification: true,
        email: normalizedEmail,
        message: "Account created. Check your email for a verification link.",
      });
      return;
    }

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

    if (isEmailVerificationEnabled() && !user.emailVerified) {
      res.status(403).json({
        error: "Please verify your email before signing in.",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
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

router.get("/auth/verify-email", async (req, res): Promise<void> => {
  const signInUrl = buildSignInRedirect({});
  const wantsHtml =
    typeof req.query.token === "string" ||
    (req.headers.accept?.includes("text/html") ?? false);

  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const result = await verifyEmailToken(token);

    if (!result.ok) {
      if (wantsHtml) {
        res
          .status(400)
          .type("html")
          .send(renderVerifyEmailError(result.reason, signInUrl));
        return;
      }
      const errorCode = result.reason === "expired" ? "expired" : "invalid";
      res.redirect(buildSignInRedirect({ verifyError: errorCode }));
      return;
    }

    if (wantsHtml) {
      res.type("html").send(renderVerifyEmailSuccess(result.email, signInUrl));
      return;
    }

    res.redirect(
      buildSignInRedirect({
        verified: "1",
        email: result.email,
      }),
    );
  } catch (err) {
    console.error("Verify email (GET) error:", err);
    if (wantsHtml) {
      res.status(500).type("html").send(renderVerifyEmailError("server", signInUrl));
      return;
    }
    res.redirect(buildSignInRedirect({ verifyError: "server" }));
  }
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  try {
    const parsed = VerifyEmailBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }

    const result = await verifyEmailToken(parsed.data.token);
    if (!result.ok) {
      const message =
        result.reason === "expired"
          ? "Verification link has expired. Request a new one."
          : "Invalid or expired verification link.";
      res.status(400).json({ error: message });
      return;
    }

    res.json({
      verified: true,
      message: "Email verified. You can sign in now.",
      email: result.email,
    });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ error: "Could not verify email. Please try again." });
  }
});

router.post("/auth/resend-verification", async (req, res): Promise<void> => {
  try {
    if (!isEmailVerificationEnabled()) {
      res.status(400).json({ error: "Email verification is not enabled." });
      return;
    }

    const parsed = ResendVerificationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalizedEmail }).select(
      "+emailVerificationTokenHash",
    );

    // Do not reveal whether the email exists
    if (!user || user.emailVerified) {
      res.json({
        message: "If that account needs verification, we sent a new link.",
      });
      return;
    }

    const { token, tokenHash, expiresAt } = createVerificationToken();
    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationExpiresAt = expiresAt;
    await user.save();

    await issueVerificationEmail(user, token);

    res.json({
      message: "If that account needs verification, we sent a new link.",
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ error: "Could not resend verification email." });
  }
});

export default router;
