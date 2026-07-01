import type { FilterQuery } from "mongoose";
import { UserModel, publiclyVisibleUserFilter, type UserDoc } from "@workspace/db";
import { isMentorshipTopicId } from "../lib/mentorship-topics";
import { hasConfiguredAvailability } from "../lib/mentorship-availability";
import { getConsultantSlotsMeta } from "./mentorship-slots";

export type ExpertListQuery = {
  excludeUserId: number;
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

export type ExpertListResult = {
  users: UserDoc[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function buildExpertFilter(query: ExpertListQuery): FilterQuery<UserDoc> {
  const and: FilterQuery<UserDoc>[] = [
    { isConsultant: true },
    { id: { $ne: query.excludeUserId } },
    publiclyVisibleUserFilter,
    { mentorshipWeeklyAvailability: { $exists: true, $not: { $size: 0 } } },
    { mentorshipTopics: { $exists: true, $not: { $size: 0 } } },
  ];

  if (query.company) {
    const re = new RegExp(escapeRegex(query.company), "i");
    and.push({
      $or: [{ company: re }, { "workExperiences.company": re }],
    });
  }

  if (query.college) {
    const re = new RegExp(escapeRegex(query.college), "i");
    and.push({ education: { $elemMatch: { institution: re } } });
  }

  if (query.branch) {
    const re = new RegExp(escapeRegex(query.branch), "i");
    and.push({ education: { $elemMatch: { stream: re } } });
  }

  if (query.graduationYear) {
    const year = parseInt(query.graduationYear, 10);
    if (!Number.isNaN(year)) {
      and.push({ education: { $elemMatch: { batchYear: year } } });
    }
  }

  if (query.category && isMentorshipTopicId(query.category)) {
    and.push({ mentorshipTopics: query.category });
  }

  if (query.experience === "0-2") {
    and.push({ experienceYears: { $lte: 2 } });
  } else if (query.experience === "3-5") {
    and.push({ experienceYears: { $gte: 3, $lte: 5 } });
  } else if (query.experience === "5+") {
    and.push({ experienceYears: { $gte: 5 } });
  }

  if (query.sessionLength) {
    const minutes = parseInt(query.sessionLength, 10);
    if (!Number.isNaN(minutes)) {
      and.push({ mentorshipDurationMinutes: minutes });
    }
  }

  if (query.price === "free") {
    and.push({ $or: [{ mentorshipPriceInr: 0 }, { mentorshipPriceInr: null }] });
  } else if (query.price === "paid") {
    and.push({ mentorshipPriceInr: { $gt: 0 } });
  }

  if (query.q) {
    const re = new RegExp(escapeRegex(query.q), "i");
    and.push({
      $or: [
        { fullName: re },
        { headline: re },
        { bio: re },
        { currentRole: re },
        { company: re },
        { skills: re },
        { "education.institution": re },
        { "education.stream": re },
        { mentorshipTopics: re },
      ],
    });
  }

  return and.length === 1 ? and[0]! : { $and: and };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listExperts(query: ExpertListQuery): Promise<ExpertListResult> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
  const filter = buildExpertFilter(query);

  const fromIso = new Date().toISOString();
  const toIso = new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString();

  const candidates = await UserModel.find(filter)
    .sort({ mentorshipSessionsCompleted: -1, totalPoints: -1 })
    .lean();

  const withSlots: { user: UserDoc; openSlotCount: number }[] = [];
  await Promise.all(
    candidates.map(async (user) => {
      if (!hasConfiguredAvailability(user.mentorshipWeeklyAvailability as { dayOfWeek: number }[])) {
        return;
      }
      const meta = await getConsultantSlotsMeta(user.id, fromIso, toIso);
      if (meta.slots.length > 0) {
        withSlots.push({ user, openSlotCount: meta.slots.length });
      }
    }),
  );

  withSlots.sort(
    (a, b) =>
      (b.user.mentorshipSessionsCompleted ?? 0) - (a.user.mentorshipSessionsCompleted ?? 0)
      || (b.user.totalPoints ?? 0) - (a.user.totalPoints ?? 0),
  );

  const total = withSlots.length;
  const slice = withSlots.slice((page - 1) * limit, page * limit);

  return {
    users: slice.map((s) => s.user),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}
