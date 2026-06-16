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
  college?: string;
  graduationYear?: string;
};

export const consultApi = {
  getMeetConfig: () => httpRequest<{ autoMeetEnabled: boolean }>("/consultations/meet-config"),
  listExperts: (filters?: MentorListFilters) => {
    const params = new URLSearchParams();
    if (filters?.q?.trim()) params.set("q", filters.q.trim());
    if (filters?.branch?.trim()) params.set("branch", filters.branch.trim());
    if (filters?.college?.trim()) params.set("college", filters.college.trim());
    if (filters?.graduationYear?.trim()) params.set("graduationYear", filters.graduationYear.trim());
    const qs = params.toString();
    return httpRequest<UserProfile[]>(`/consultations/experts${qs ? `?${qs}` : ""}`);
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
