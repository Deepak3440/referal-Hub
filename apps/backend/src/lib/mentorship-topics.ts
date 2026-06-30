/** Topic IDs shown on mentorship category chips — must match frontend MENTOR_CATEGORIES */
export const MENTORSHIP_TOPIC_IDS = [
  "software",
  "data",
  "product",
  "mba",
  "interview",
  "career",
  "abroad",
] as const;

export type MentorshipTopicId = (typeof MENTORSHIP_TOPIC_IDS)[number];

export function isMentorshipTopicId(value: string): value is MentorshipTopicId {
  return (MENTORSHIP_TOPIC_IDS as readonly string[]).includes(value);
}
