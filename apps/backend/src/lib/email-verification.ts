import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;
const EXPIRY_HOURS = 24;

export function isEmailVerificationEnabled(): boolean {
  const raw = process.env.EMAIL_VERIFICATION_ENABLED?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return true;
}

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createVerificationToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);
  return {
    token,
    tokenHash: hashVerificationToken(token),
    expiresAt,
  };
}

export function getApiPublicBase(): string {
  const explicit = process.env.API_PUBLIC_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const frontend = process.env.FRONTEND_URL?.trim();
  if (frontend) return frontend.replace(/\/$/, "");
  return "http://localhost:5173";
}

/** Link in verification email — hits backend directly (no SPA required). */
export function getVerificationLink(token: string): string {
  const url = new URL("/api/auth/verify-email", getApiPublicBase());
  url.searchParams.set("token", token);
  return url.toString();
}
