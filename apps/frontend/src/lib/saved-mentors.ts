import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "referaa_saved_mentors";

function readSaved(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export function useSavedMentors() {
  const [saved, setSaved] = useState<number[]>([]);

  useEffect(() => {
    setSaved(readSaved());
  }, []);

  const toggle = useCallback((userId: number) => {
    setSaved((prev) => {
      const next = prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isSaved = useCallback((userId: number) => saved.includes(userId), [saved]);

  return { isSaved, toggle };
}

/** Real mentor trust line — no fake star ratings until post-session reviews exist */
export function mentorTrustLine(
  user: Pick<UserProfile, "mentorshipSessionsCompleted" | "id">,
): { primary: string; secondary?: string } {
  const sessions = user.mentorshipSessionsCompleted ?? 0;
  if (sessions > 0) {
    return {
      primary: `${sessions} session${sessions === 1 ? "" : "s"} completed`,
      secondary: "Alumni verified",
    };
  }
  return { primary: "Alumni verified" };
}
