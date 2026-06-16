import type { ReferralStatus } from "./rewards";

const BLOCKED_MESSAGES: Record<ReferralStatus, string> = {
  pending:
    "You already sent a referral request for this job. It is waiting for the alumni to respond.",
  accepted:
    "You already have an accepted referral request for this job. Track it under Track Requests.",
  referred:
    "You are already in the referral process for this job. Only one request is allowed per opening.",
  interviewing:
    "Your interview is in progress for this job. You cannot send another referral request.",
  rejected:
    "Your referral request was declined for this job. You cannot send another request for the same opening.",
  rejected_after_interview:
    "You were not selected for this job. This referral request is closed and cannot be sent again.",
  hired:
    "You were hired through this referral. This request is complete — no further requests are needed.",
};

export function referralAlreadyExistsMessage(status: string): string {
  return BLOCKED_MESSAGES[status as ReferralStatus] ?? "You already have a referral request for this job.";
}
