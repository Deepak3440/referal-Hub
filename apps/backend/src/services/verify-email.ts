import { UserModel } from "@workspace/db";
import { hashVerificationToken } from "../lib/email-verification";

export type VerifyEmailResult =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "expired" };

export async function verifyEmailToken(rawToken: string): Promise<VerifyEmailResult> {
  const token = rawToken.trim();
  if (!token) {
    return { ok: false, reason: "invalid" };
  }

  const tokenHash = hashVerificationToken(token);
  const user = await UserModel.findOne({ emailVerificationTokenHash: tokenHash }).select(
    "+emailVerificationTokenHash +emailVerificationExpiresAt",
  );

  if (!user) {
    return { ok: false, reason: "invalid" };
  }

  if (
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt.getTime() < Date.now()
  ) {
    return { ok: false, reason: "expired" };
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await user.save();

  return { ok: true, email: user.email };
}

export function getFrontendBaseUrl(): string {
  return (process.env.FRONTEND_URL?.trim() || "http://localhost:5173").replace(/\/$/, "");
}

export function buildSignInRedirect(params: Record<string, string>): string {
  const url = new URL("/sign-in", getFrontendBaseUrl());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
