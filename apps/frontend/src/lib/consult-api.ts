import type { UserProfile } from "@workspace/api-client-react";
import { httpRequest } from "@/lib/http-client";

export type ConsultationParticipant = {
  userId: number;
  role: "consultant" | "customer";
  joinedAt: string | null;
  leftAt: string | null;
  durationSeconds: number | null;
};

export type ConsultationStatus =
  | "pending"
  | "pending_payment"
  | "scheduled"
  | "waiting_for_participants"
  | "started"
  | "completed"
  | "cancelled"
  | "rejected";

export type Consultation = {
  id: number;
  requesterId: number;
  consultantId: number;
  message: string | null;
  status: ConsultationStatus;
  scheduledAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  amountInr: number;
  amountPoints: number;
  pointsReserved: boolean;
  pointsDeducted: boolean;
  pointsDeductedAt: string | null;
  mentorPointsCredited: boolean;
  paymentStatus: "not_required" | "pending" | "authorized" | "simulated" | "paid" | "refunded";
  paymentRef: string | null;
  videoProvider: string | null;
  roomName: string | null;
  roomId: string | null;
  meetingLink: string | null;
  meetingStatus: string;
  sessionStatus: "scheduled" | "started" | "completed" | "cancelled" | "expired";
  actualStartAt: string | null;
  actualEndAt: string | null;
  durationSeconds: number | null;
  participants: ConsultationParticipant[];
  disputeStatus: "none" | "open" | "resolved_refund" | "resolved_mentor" | "resolved_dismissed";
  disputeReason: string | null;
  disputeRaisedAt: string | null;
  disputeResolvedAt: string | null;
  disputeAdminNote: string | null;
  createdAt: string;
  updatedAt?: string;
  requester?: UserProfile | null;
  consultant?: UserProfile | null;
};

export type MentorSlot = {
  startAt: string;
  endAt: string;
  durationMinutes: number;
};

export type MentorSlotsResponse = {
  slots: MentorSlot[];
  availabilityConfigured: boolean;
  weeklySchedule: string[];
  durationMinutes: number;
};

export type WeeklyAvailabilityBlock = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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
  getVideoConfig: () =>
    httpRequest<{
      provider: string;
      paymentEnabled: boolean;
      paymentMethod: "points";
      pointsBalance: number;
      isAdmin?: boolean;
    }>("/consultations/video-config"),
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
  getMentorSlots: (consultantId: number, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return httpRequest<MentorSlotsResponse>(
      `/consultations/experts/${consultantId}/slots${qs ? `?${qs}` : ""}`,
    );
  },
  listConsultations: (role?: "requester" | "consultant" | "all") =>
    httpRequest<Consultation[]>(`/consultations${role ? `?role=${role}` : ""}`),
  getConsultation: (id: number) => httpRequest<Consultation>(`/consultations/${id}`),
  bookConsultation: (body: { consultantId: number; slotStartAt: string; message?: string }) =>
    httpRequest<Consultation>("/consultations/book", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  confirmPayment: (id: number) =>
    httpRequest<
      Consultation & {
        payment: {
          paymentRef: string | null;
          meetingLink: string;
          pointsReserved: number;
          pointsDeducted: number;
          balanceAfter: number | null;
          paymentMethod: "points" | "none";
          chargeNote: string;
        };
      }
    >(`/consultations/${id}/pay`, { method: "POST", body: JSON.stringify({}) }),
  joinConsultation: (id: number) =>
    httpRequest<Consultation>(`/consultations/${id}/join`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  updateConsultation: (id: number, body: { status: "cancelled" | "completed" | "rejected" }) =>
    httpRequest<Consultation & { pointsCreditedToMentor?: number }>(`/consultations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  raiseDispute: (id: number, reason: string) =>
    httpRequest<Consultation>(`/consultations/${id}/dispute`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  listOpenDisputes: () =>
    httpRequest<Consultation[]>("/admin/mentorship/disputes"),
  resolveDispute: (
    id: number,
    body: { resolution: "refund" | "mentor" | "dismiss"; adminNote?: string },
  ) =>
    httpRequest<{ ok: boolean; openCount: number }>(`/admin/mentorship/disputes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export const CONSULT_QUERY_KEYS = {
  videoConfig: ["/api/consultations/video-config"] as const,
  experts: (filters?: MentorListFilters) => ["/api/consultations/experts", filters ?? {}] as const,
  slots: (consultantId: number) => ["/api/consultations/experts", consultantId, "slots"] as const,
  list: (role?: string) => ["/api/consultations", role ?? "all"] as const,
  detail: (id: number) => ["/api/consultations", id] as const,
  disputes: ["/api/admin/mentorship/disputes"] as const,
};
