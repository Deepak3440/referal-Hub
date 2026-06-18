import type { Referral } from "@workspace/api-client-react";
import type { CompanyReferralRequestResult } from "@/lib/company-referral-api";
import { isClosedReferralStatus } from "@/lib/referral";

/** 0 = pending, 1 = in progress, 2 = closed (hired / rejected) */
export type TrackRequestSortTier = 0 | 1 | 2;

export type TrackRequestListItem =
  | { kind: "company"; createdAt: string; request: CompanyReferralRequestResult; tier: TrackRequestSortTier }
  | { kind: "job"; createdAt: string; referral: Referral; tier: TrackRequestSortTier };

function companyWorkflowStatus(request: CompanyReferralRequestResult): string {
  if (request.workflowStatus) return request.workflowStatus;
  if (request.acceptedByReferrerId) return "accepted";
  if (request.status === "declined" || request.status === "closed") return "rejected";
  return request.status;
}

function companySortTier(request: CompanyReferralRequestResult): TrackRequestSortTier {
  const waiting = companyWorkflowStatus(request) === "pending" && !request.acceptedByReferrerId;
  if (waiting) return 0;
  const status = companyWorkflowStatus(request);
  if (isClosedReferralStatus(status) || status === "rejected") return 2;
  return 1;
}

function jobSortTier(status: string): TrackRequestSortTier {
  if (status === "pending") return 0;
  if (isClosedReferralStatus(status)) return 2;
  return 1;
}

export type TrackRequestFilter = "all" | "pending" | "in_progress" | "hired";

export function getTrackRequestFilter(item: TrackRequestListItem): TrackRequestFilter {
  if (item.kind === "job") {
    if (item.referral.status === "hired") return "hired";
    if (item.referral.status === "pending") return "pending";
    if (item.tier === 1) return "in_progress";
    return "all";
  }
  const status = companyWorkflowStatus(item.request);
  if (status === "hired") return "hired";
  if (item.tier === 0) return "pending";
  if (item.tier === 1) return "in_progress";
  return "all";
}

export function filterTrackRequestItems(
  items: TrackRequestListItem[],
  filter: TrackRequestFilter,
): TrackRequestListItem[] {
  if (filter === "all") return items;
  return items.filter((item) => getTrackRequestFilter(item) === filter);
}

/** Pending & active first (newest first); hired / closed last (newest first within that group). */
export function sortTrackRequestItems(
  companyItems: CompanyReferralRequestResult[],
  jobItems: Referral[],
): TrackRequestListItem[] {
  const merged: TrackRequestListItem[] = [
    ...companyItems.map((request) => ({
      kind: "company" as const,
      createdAt: request.createdAt,
      request,
      tier: companySortTier(request),
    })),
    ...jobItems.map((referral) => ({
      kind: "job" as const,
      createdAt: referral.createdAt,
      referral,
      tier: jobSortTier(referral.status),
    })),
  ];

  return merged.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
