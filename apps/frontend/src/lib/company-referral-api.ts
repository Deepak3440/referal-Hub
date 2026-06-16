import { httpRequest } from "@/lib/http-client";
import type { UserProfile } from "@workspace/api-client-react";

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
  status: string;
  createdAt: string;
};

export type IncomingCompanyReferralRequest = CompanyReferralRequestResult & {
  requester: UserProfile | null;
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
};
