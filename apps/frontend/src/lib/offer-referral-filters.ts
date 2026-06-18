import type { Job } from "@workspace/api-client-react";
import type { IncomingCompanyReferralRequest } from "@/lib/company-referral-api";
import type { ReferralFilter } from "@/components/referrals/referral-request-row";

const ACTIVE_STATUSES = new Set(["accepted", "referred", "interviewing"]);
const CLOSED_STATUSES = new Set([
  "hired",
  "rejected",
  "rejected_after_interview",
  "already_referred",
]);

export type JobReferralCounts = Map<number, { pending: number; active: number }>;

export function buildJobReferralCounts(
  referrals: { jobId: number; status: string }[],
): JobReferralCounts {
  const map: JobReferralCounts = new Map();
  for (const r of referrals) {
    const cur = map.get(r.jobId) ?? { pending: 0, active: 0 };
    if (r.status === "pending") cur.pending += 1;
    if (ACTIVE_STATUSES.has(r.status)) cur.active += 1;
    map.set(r.jobId, cur);
  }
  return map;
}

export function sumJobPending(counts: JobReferralCounts): number {
  let total = 0;
  counts.forEach((c) => {
    total += c.pending;
  });
  return total;
}

export function sumJobActive(counts: JobReferralCounts): number {
  let total = 0;
  counts.forEach((c) => {
    total += c.active;
  });
  return total;
}

export function visibleCompanyReferrals(items: IncomingCompanyReferralRequest[]) {
  return items.filter((r) => r.referrerStatus !== "personal_rejected");
}

export function filterCompanyReferrals(
  items: IncomingCompanyReferralRequest[],
  filter: ReferralFilter,
): IncomingCompanyReferralRequest[] {
  const visible = visibleCompanyReferrals(items);
  const filtered = visible.filter((r) => {
    if (filter === "all") return true;
    if (filter === "pending") return r.referrerStatus === "pending";
    if (filter === "active") return ACTIVE_STATUSES.has(r.referrerStatus);
    return CLOSED_STATUSES.has(r.referrerStatus);
  });

  const priority: Record<string, number> = {
    pending: 0,
    accepted: 1,
    referred: 2,
    interviewing: 3,
    hired: 4,
    already_referred: 5,
    rejected: 6,
    rejected_after_interview: 7,
  };

  return [...filtered].sort(
    (a, b) => (priority[a.referrerStatus] ?? 99) - (priority[b.referrerStatus] ?? 99),
  );
}

export function companyReferralFilterCounts(
  items: IncomingCompanyReferralRequest[],
): Record<ReferralFilter, number> {
  const visible = visibleCompanyReferrals(items);
  return {
    all: visible.length,
    pending: visible.filter((r) => r.referrerStatus === "pending").length,
    active: visible.filter((r) => ACTIVE_STATUSES.has(r.referrerStatus)).length,
    closed: visible.filter((r) => CLOSED_STATUSES.has(r.referrerStatus)).length,
  };
}

export function filterJobOpenings(
  jobs: Job[],
  filter: ReferralFilter,
  counts?: JobReferralCounts,
): Job[] {
  const filtered = jobs.filter((job) => {
    const jobCounts = counts?.get(job.id);
    if (filter === "all") return true;
    if (filter === "pending") return (jobCounts?.pending ?? 0) > 0;
    if (filter === "active") return (jobCounts?.active ?? 0) > 0;
    return job.referralCount === 0;
  });

  if (filter === "pending") {
    return [...filtered].sort(
      (a, b) => (counts?.get(b.id)?.pending ?? 0) - (counts?.get(a.id)?.pending ?? 0),
    );
  }
  if (filter === "active") {
    return [...filtered].sort(
      (a, b) => (counts?.get(b.id)?.active ?? 0) - (counts?.get(a.id)?.active ?? 0),
    );
  }
  return filtered;
}

export function jobOpeningFilterCounts(
  jobs: Job[],
  counts?: JobReferralCounts,
): Record<ReferralFilter, number> {
  let pendingOpenings = 0;
  let activeOpenings = 0;
  for (const job of jobs) {
    const jobCounts = counts?.get(job.id);
    if ((jobCounts?.pending ?? 0) > 0) pendingOpenings += 1;
    if ((jobCounts?.active ?? 0) > 0) activeOpenings += 1;
  }
  return {
    all: jobs.length,
    pending: pendingOpenings,
    active: activeOpenings,
    closed: jobs.filter((j) => j.referralCount === 0).length,
  };
}
