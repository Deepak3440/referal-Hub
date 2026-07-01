import type { UserProfile } from "@workspace/api-client-react";
import type { WeeklyAvailabilityBlock } from "@/lib/consult-api";

/** Primary education row for mentor list filters / display */
export function getPrimaryEducation(profile: UserProfile) {
  const edu = profile.education?.[0];
  if (!edu) return null;
  return {
    college: edu.institution,
    branch: edu.stream,
    graduationYear: edu.batchYear,
    level: edu.level,
  };
}

/** Company, role, experience, education, and about for mentor list cards */
export function getMentorCardSummary(profile: UserProfile) {
  const latestWork = profile.workExperiences?.[0];
  const edu = getPrimaryEducation(profile);
  return {
    company: profile.company?.trim() || latestWork?.company?.trim() || null,
    role: profile.currentRole?.trim() || latestWork?.role?.trim() || null,
    experienceYears:
      profile.experienceYears != null && profile.experienceYears >= 0
        ? profile.experienceYears
        : null,
    college: edu?.college ?? null,
    stream: edu?.branch ?? null,
    passoutYear: edu?.graduationYear ?? null,
    about: profile.bio?.trim() || profile.headline?.trim() || "",
  };
}

export function formatExperienceYears(years: number | null): string {
  if (years == null) return "—";
  if (years === 0) return "Fresher";
  return `${years} yr${years === 1 ? "" : "s"}`;
}

export const MENTORSHIP_DURATION_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
] as const;

export function formatMentorshipSession(
  profile: Pick<UserProfile, "mentorshipDurationMinutes" | "mentorshipPriceInr">,
): string | null {
  const minutes = profile.mentorshipDurationMinutes;
  if (minutes == null || minutes <= 0) return null;

  const duration = `${minutes} min`;
  const price = profile.mentorshipPriceInr;
  if (price == null || price <= 0) return `${duration} · Free`;
  return `${duration} · ${price} pts`;
}

export function hasMentorshipSessionOffer(
  profile: Pick<UserProfile, "mentorshipDurationMinutes" | "mentorshipPriceInr">,
): boolean {
  return profile.mentorshipDurationMinutes != null && profile.mentorshipDurationMinutes > 0;
}

export type MentorFilters = {
  q?: string;
  branch?: string;
  company?: string;
  college?: string;
  graduationYear?: string;
  /** Client-side filters (applied after API fetch) */
  category?: string;
  experience?: string;
  sessionLength?: string;
  price?: string;
};

export function countActiveMentorFilters(filters: MentorFilters): number {
  let n = 0;
  if (filters.college?.trim()) n++;
  if (filters.branch?.trim()) n++;
  if (filters.sessionLength?.trim()) n++;
  if (filters.price?.trim()) n++;
  return n;
}

export function countPrimaryMentorFilters(filters: MentorFilters): number {
  let n = 0;
  if (filters.company?.trim()) n++;
  if (filters.graduationYear?.trim()) n++;
  if (filters.experience?.trim()) n++;
  return n;
}

export function buildExpertsQuery(filters: MentorFilters): string {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.branch?.trim()) params.set("branch", filters.branch.trim());
  if (filters.company?.trim()) params.set("company", filters.company.trim());
  if (filters.college?.trim()) params.set("college", filters.college.trim());
  if (filters.graduationYear?.trim()) params.set("graduationYear", filters.graduationYear.trim());
  if (filters.category?.trim()) params.set("category", filters.category.trim());
  if (filters.experience?.trim()) params.set("experience", filters.experience.trim());
  if (filters.sessionLength?.trim()) params.set("sessionLength", filters.sessionLength.trim());
  if (filters.price?.trim()) params.set("price", filters.price.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function hasMentorAvailabilityConfigured(
  profile: Pick<UserProfile, "mentorshipWeeklyAvailability">,
): boolean {
  const blocks = (
    profile as UserProfile & { mentorshipWeeklyAvailability?: WeeklyAvailabilityBlock[] }
  ).mentorshipWeeklyAvailability;
  return Array.isArray(blocks) && blocks.length > 0;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatWeeklyAvailabilityLines(blocks: WeeklyAvailabilityBlock[]): string[] {
  if (!blocks.length) return [];
  const byDay = new Map<number, string[]>();
  for (const b of blocks) {
    const label = `${b.startTime}–${b.endTime}`;
    if (!byDay.has(b.dayOfWeek)) byDay.set(b.dayOfWeek, []);
    byDay.get(b.dayOfWeek)!.push(label);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dow, ranges]) => `${DAY_NAMES[dow]} ${ranges.join(", ")}`);
}

export function canMarkSessionComplete(session: {
  status: string;
  scheduledAt: string | null;
  pointsDeducted?: boolean;
  amountPoints?: number;
  amountInr?: number;
}): boolean {
  if (!["scheduled", "waiting_for_participants", "started"].includes(session.status)) {
    return false;
  }
  const fee = session.amountPoints ?? session.amountInr ?? 0;
  if (fee > 0 && session.status !== "started" && !session.pointsDeducted) {
    return false;
  }
  if (!session.scheduledAt) return session.status === "started";
  return new Date(session.scheduledAt).getTime() <= Date.now() + 5 * 60_000;
}

export function canRaiseSessionDispute(session: {
  status: string;
  requesterId?: number;
  pointsDeducted: boolean;
  mentorPointsCredited: boolean;
  disputeStatus: string;
}): boolean {
  if (session.disputeStatus !== "none") return false;
  if (!session.pointsDeducted || session.mentorPointsCredited) return false;
  return ["started", "completed", "waiting_for_participants"].includes(session.status);
}

export function sessionPointsLabel(session: {
  amountPoints?: number;
  amountInr?: number;
  pointsReserved?: boolean;
  pointsDeducted?: boolean;
  mentorPointsCredited?: boolean;
}): string | null {
  const pts = session.amountPoints ?? session.amountInr ?? 0;
  if (pts <= 0) return null;
  if (session.mentorPointsCredited) return `${pts} pts paid to mentor`;
  if (session.pointsDeducted) return `${pts} pts charged`;
  if (session.pointsReserved) return `${pts} pts reserved (charged when live)`;
  return `${pts} pts`;
}

export const JOIN_EARLY_MINUTES = 10;
export const JOIN_GRACE_AFTER_MINUTES = 15;

export type SessionJoinWindow = {
  opensAt: Date;
  closesAt: Date;
  isOpen: boolean;
  isTooEarly: boolean;
  isPast: boolean;
};

export function getSessionJoinWindow(session: {
  scheduledAt: string | null;
  scheduledEndAt?: string | null;
  durationMinutes?: number;
}): SessionJoinWindow | null {
  if (!session.scheduledAt) return null;
  const startMs = new Date(session.scheduledAt).getTime();
  const endMs = session.scheduledEndAt
    ? new Date(session.scheduledEndAt).getTime()
    : startMs + (session.durationMinutes ?? 30) * 60_000;
  const opensAt = new Date(startMs - JOIN_EARLY_MINUTES * 60_000);
  const closesAt = new Date(endMs + JOIN_GRACE_AFTER_MINUTES * 60_000);
  const now = Date.now();
  return {
    opensAt,
    closesAt,
    isOpen: now >= opensAt.getTime() && now <= closesAt.getTime(),
    isTooEarly: now < opensAt.getTime(),
    isPast: now > closesAt.getTime(),
  };
}

export function sessionStatusLabel(session: {
  status: string;
  scheduledAt?: string | null;
  scheduledEndAt?: string | null;
  durationMinutes?: number;
}): string {
  if (session.status === "started") return "Live";
  if (session.status === "waiting_for_participants") return "Waiting for mentor";
  if (session.status === "scheduled" && session.scheduledAt) {
    const w = getSessionJoinWindow(session);
    if (w?.isTooEarly) return "Scheduled";
  }
  const map: Record<string, string> = {
    pending: "Pending",
    pending_payment: "Awaiting confirm",
    scheduled: "Scheduled",
    waiting_for_participants: "Waiting for mentor",
    started: "Live",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Declined",
  };
  return map[session.status] ?? session.status;
}

export function canEnterVideoRoom(session: {
  status: string;
  meetingLink: string | null;
  scheduledAt: string | null;
  scheduledEndAt?: string | null;
  durationMinutes?: number;
}): boolean {
  if (!session.meetingLink) return false;
  if (!["scheduled", "waiting_for_participants", "started"].includes(session.status)) {
    return false;
  }
  const w = getSessionJoinWindow(session);
  if (!w) return session.status === "started";
  return w.isOpen || session.status === "started";
}

/** @deprecated All mentor filters run on the server — list comes pre-filtered */
export function filterMentorsOnClient(mentors: UserProfile[], _filters: MentorFilters): UserProfile[] {
  return mentors;
}
