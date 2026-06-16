export type ReferralStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "referred"
  | "interviewing"
  | "hired"
  | "rejected_after_interview";

export const STATUS_LABELS: Record<ReferralStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  referred: "Referred",
  interviewing: "Interviewing",
  hired: "Hired",
  rejected_after_interview: "Not Selected",
};

export const FLOW_STEPS: { key: ReferralStatus; label: string }[] = [
  { key: "pending", label: "Request" },
  { key: "accepted", label: "Accepted" },
  { key: "referred", label: "Referred" },
  { key: "interviewing", label: "Interview" },
  { key: "hired", label: "Hired" },
];

/** Shown to job poster when they update status — use formatStageTransferPoster(rewardPoints, stage) */
export function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20";
    case "accepted":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-500 border-blue-500/20";
    case "referred":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-500 border-indigo-500/20";
    case "interviewing":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-500 border-purple-500/20";
    case "hired":
      return "bg-green-500/10 text-green-700 dark:text-green-500 border-green-500/20";
    case "rejected":
    case "rejected_after_interview":
      return "bg-red-500/10 text-red-700 dark:text-red-500 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  }
}

/** Softer badge — readable color without being loud (Track Requests, etc.) */
export function getStatusColorSoft(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-800 border-amber-200/70 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/40";
    case "accepted":
      return "bg-sky-50 text-sky-800 border-sky-200/70 dark:bg-sky-950/30 dark:text-sky-200 dark:border-sky-800/40";
    case "referred":
      return "bg-indigo-50 text-indigo-800 border-indigo-200/70 dark:bg-indigo-950/30 dark:text-indigo-200 dark:border-indigo-800/40";
    case "interviewing":
      return "bg-violet-50 text-violet-800 border-violet-200/70 dark:bg-violet-950/30 dark:text-violet-200 dark:border-violet-800/40";
    case "hired":
      return "bg-emerald-50 text-emerald-800 border-emerald-200/70 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800/40";
    case "rejected":
    case "rejected_after_interview":
      return "bg-red-50 text-red-800 border-red-200/70 dark:bg-red-950/30 dark:text-red-200 dark:border-red-800/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

/** Progress bar fill tint by status */
export function getStatusProgressColor(status: string): string {
  switch (status) {
    case "pending":
      return "[&>div]:bg-amber-500";
    case "accepted":
      return "[&>div]:bg-sky-500";
    case "referred":
      return "[&>div]:bg-indigo-500";
    case "interviewing":
      return "[&>div]:bg-violet-500";
    case "hired":
      return "[&>div]:bg-emerald-500";
    default:
      return "[&>div]:bg-primary/70";
  }
}

export function getFlowStepIndex(status: ReferralStatus): number {
  if (status === "rejected" || status === "rejected_after_interview") return -1;
  const idx = FLOW_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

/** 0–100 progress through the happy-path referral pipeline */
export function getReferralProgressPercent(status: string): number {
  if (status === "rejected" || status === "rejected_after_interview") return 0;
  const idx = getFlowStepIndex(status as ReferralStatus);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / FLOW_STEPS.length) * 100);
}

export function getReferralProgressLabel(status: string): string {
  if (status === "rejected") return "Request was rejected";
  if (status === "rejected_after_interview") return "Not selected after interview";
  const idx = getFlowStepIndex(status as ReferralStatus);
  if (idx < 0) return "Not started";
  return `Step ${idx + 1} of ${FLOW_STEPS.length}: ${FLOW_STEPS[idx].label}`;
}

/** True when the user already has a referral row for this job (any status). */
export function hasReferralRequest(status: string | null | undefined): status is ReferralStatus {
  return Boolean(status);
}

export function canSendReferralRequest(status: string | null | undefined): boolean {
  return !hasReferralRequest(status);
}

export function isClosedReferralStatus(status: string): boolean {
  return status === "rejected" || status === "rejected_after_interview" || status === "hired";
}

/** User-facing copy when a new request is blocked because one already exists. */
export function getReferralBlockedMessage(status: ReferralStatus): string {
  switch (status) {
    case "pending":
      return "You already sent a request for this job. Wait for the alumni to accept or decline.";
    case "accepted":
      return "Your request was accepted. Track updates here — you cannot send another request.";
    case "referred":
      return "You are in the referral process for this job. Only one request is allowed per opening.";
    case "interviewing":
      return "Interview is in progress for this request. You cannot send another request.";
    case "rejected":
      return "This alumni declined your request. Only one request is allowed per job opening.";
    case "rejected_after_interview":
      return "You were not selected after interview. This request is closed — you cannot apply again.";
    case "hired":
      return "You were hired through this referral. This request is complete.";
    default:
      return "You already have a referral request for this job.";
  }
}

export function getReferralCtaLabel(status: ReferralStatus): string {
  if (status === "rejected" || status === "rejected_after_interview") return "View declined request";
  if (status === "hired") return "View hired request";
  if (status === "pending") return "Track request";
  return "Track progress";
}
