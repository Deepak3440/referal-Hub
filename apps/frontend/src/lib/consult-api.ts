import type { UserProfile } from "@workspace/api-client-react";
import { httpRequest } from "@/lib/http-client";

export type Consultation = {
  id: number;
  requesterId: number;
  consultantId: number;
  message: string | null;
  status: "pending" | "scheduled" | "rejected" | "completed" | "cancelled";
  scheduledAt: string | null;
  durationMinutes: number;
  meetingLink: string | null;
  createdAt: string;
  updatedAt?: string;
  requester?: UserProfile | null;
  consultant?: UserProfile | null;
};

export type MentorListFilters = {
  q?: string;
  branch?: string;
  company?: string;
  college?: string;
  graduationYear?: string;
  category?: string;
  experience?: string;
  sessionLength?: string;
  price?: string;
  page?: number;
  limit?: number;
};

export type ExpertsListResponse = {
  items: UserProfile[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export const MENTOR_PAGE_SIZE = 20;

export const consultApi = {
  getMeetConfig: () => httpRequest<{ autoMeetEnabled: boolean }>("/consultations/meet-config"),
  listExperts: (filters?: MentorListFilters) => {
    const params = new URLSearchParams();
    if (filters?.q?.trim()) params.set("q", filters.q.trim());
    if (filters?.branch?.trim()) params.set("branch", filters.branch.trim());
    if (filters?.company?.trim()) params.set("company", filters.company.trim());
    if (filters?.college?.trim()) params.set("college", filters.college.trim());
    if (filters?.graduationYear?.trim()) params.set("graduationYear", filters.graduationYear.trim());
    if (filters?.category?.trim()) params.set("category", filters.category.trim());
    if (filters?.experience?.trim()) params.set("experience", filters.experience.trim());
    if (filters?.sessionLength?.trim()) params.set("sessionLength", filters.sessionLength.trim());
    if (filters?.price?.trim()) params.set("price", filters.price.trim());
    if (filters?.page != null) params.set("page", String(filters.page));
    if (filters?.limit != null) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return httpRequest<ExpertsListResponse>(`/consultations/experts${qs ? `?${qs}` : ""}`);
  },
  listConsultations: (role?: "requester" | "consultant" | "all") =>
    httpRequest<Consultation[]>(`/consultations${role ? `?role=${role}` : ""}`),
  getConsultation: (id: number) => httpRequest<Consultation>(`/consultations/${id}`),
  requestConsultation: (consultantId: number, message?: string) =>
    httpRequest<Consultation>("/consultations", {
      method: "POST",
      body: JSON.stringify({ consultantId, message }),
    }),
  updateConsultation: (
    id: number,
    body: {
      status: "scheduled" | "rejected" | "completed" | "cancelled";
      scheduledAt?: string;
      durationMinutes?: number;
      meetingLink?: string;
    },
  ) =>
    httpRequest<Consultation>(`/consultations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export const CONSULT_QUERY_KEYS = {
  meetConfig: ["/api/consultations/meet-config"] as const,
  experts: (filters?: MentorListFilters) => ["/api/consultations/experts", filters ?? {}] as const,
  list: (role?: string) => ["/api/consultations", role ?? "all"] as const,
  detail: (id: number) => ["/api/consultations", id] as const,
};
