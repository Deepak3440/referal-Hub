import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

let transporter: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getTransporter(): ReturnType<typeof nodemailer.createTransport> | null {
  if (transporter !== undefined) return transporter;

  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    transporter = null;
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "Referaa <noreply@referaa.com>";
}

export async function sendVerificationEmail(params: {
  to: string;
  fullName: string;
  verifyUrl: string;
}): Promise<void> {
  const subject = "Verify your Referaa account";
  const text = [
    `Hi ${params.fullName},`,
    "",
    "Thanks for signing up on Referaa. Please verify your email to activate your account:",
    "",
    params.verifyUrl,
    "",
    "This link expires in 24 hours. If you did not create an account, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>Hi ${escapeHtml(params.fullName)},</p>
    <p>Thanks for signing up on <strong>Referaa</strong>. Please verify your email to activate your account:</p>
    <p><a href="${params.verifyUrl}" style="display:inline-block;padding:10px 18px;background:#157E9A;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Verify email</a></p>
    <p style="word-break:break-all;color:#64748b;font-size:13px;">Or copy this link:<br>${escapeHtml(params.verifyUrl)}</p>
    <p style="color:#64748b;font-size:13px;">This link expires in 24 hours.</p>
  `;

  const mailer = getTransporter();
  if (!mailer) {
    logger.warn(
      { to: params.to, verifyUrl: params.verifyUrl },
      "SMTP not configured — verification link logged (set SMTP_HOST, SMTP_USER, SMTP_PASS in .env)",
    );
    console.log("\n--- Email verification link (dev) ---");
    console.log(`To: ${params.to}`);
    console.log(`Link: ${params.verifyUrl}`);
    console.log("-----------------------------------\n");
    return;
  }

  await mailer.sendMail({
    from: getFromAddress(),
    to: params.to,
    subject,
    text,
    html,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
