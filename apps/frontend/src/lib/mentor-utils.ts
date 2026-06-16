import type { UserProfile } from "@workspace/api-client-react";

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
  return `${duration} · ₹${price.toLocaleString("en-IN")}`;
}

export function hasMentorshipSessionOffer(
  profile: Pick<UserProfile, "mentorshipDurationMinutes" | "mentorshipPriceInr">,
): boolean {
  return profile.mentorshipDurationMinutes != null && profile.mentorshipDurationMinutes > 0;
}

export type MentorFilters = {
  q?: string;
  branch?: string;
  college?: string;
  graduationYear?: string;
};

export function buildExpertsQuery(filters: MentorFilters): string {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.branch?.trim()) params.set("branch", filters.branch.trim());
  if (filters.college?.trim()) params.set("college", filters.college.trim());
  if (filters.graduationYear?.trim()) params.set("graduationYear", filters.graduationYear.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
