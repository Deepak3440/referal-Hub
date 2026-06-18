import { httpRequest } from "@/lib/http-client";
import type { UserProfile } from "@workspace/api-client-react";
import type { ReferralStatus } from "@/lib/referral";

export type CompanyReferrerRow = {
  company: string;
  companyKey: string;
  referrerCount: number;
  jobCount: number;
};

export type CompanyReferralRequestInput = {
  company: string;
  roleTitle: string;
  jobUrl: string;
  note: string;
  resumeUrl?: string | null;
};

export type CompanyReferrerViewStatus =
  | "pending"
  | "personal_rejected"
  | "already_referred"
  | ReferralStatus;

export type CompanyReferralRequestResult = {
  id: number;
  requesterId: number;
  company: string;
  roleTitle: string;
  jobUrl: string;
  note: string;
  resumeUrl: string | null;
  referrerCount: number;
  referrerIds?: number[];
  acceptedByReferrerId?: number | null;
  rejectedReferrerIds?: number[];
  status: string;
  createdAt: string;
  pendingReferrerCount?: number;
  workflowStatus?: ReferralStatus;
  rewardPoints?: number;
  rewardStagesApplied?: string[];
  handlerReferrer?: UserProfile | null;
};

export type IncomingCompanyReferralRequest = CompanyReferralRequestResult & {
  requester: UserProfile | null;
  referrerStatus: CompanyReferrerViewStatus;
};

export const COMPANY_REFERRAL_QUERY_KEYS = {
  mine: ["company-referral-requests", "mine"] as const,
  incoming: ["company-referral-requests", "incoming"] as const,
};

export const companyReferralApi = {
  listCompanies: (search?: string) => {
    const params = new URLSearchParams();
    if (search?.trim()) params.set("search", search.trim());
    const qs = params.toString();
    return httpRequest<{ items: CompanyReferrerRow[]; total: number }>(
      `/companies/referrers${qs ? `?${qs}` : ""}`,
    );
  },

  listMine: () =>
    httpRequest<{ items: CompanyReferralRequestResult[]; total: number }>(
      "/company-referral-requests",
    ),

  listIncoming: () =>
    httpRequest<{ items: IncomingCompanyReferralRequest[]; total: number }>(
      "/company-referral-requests/incoming",
    ),

  uploadResume: (data: string, mimeType: string) =>
    httpRequest<{ url: string }>("/company-referral-requests/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, mimeType }),
    }),

  createRequest: (payload: CompanyReferralRequestInput) =>
    httpRequest<CompanyReferralRequestResult>("/company-referral-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  respond: (requestId: number, action: "accept" | "reject") =>
    httpRequest<IncomingCompanyReferralRequest>(
      `/company-referral-requests/${requestId}/respond`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    ),

  updateStatus: (requestId: number, status: ReferralStatus) =>
    httpRequest<IncomingCompanyReferralRequest>(
      `/company-referral-requests/${requestId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    ),
};
