/** Minutes before scheduled start when the video room opens. */
export const JOIN_EARLY_MINUTES = 10;

/** Minutes after scheduled end when join is still allowed. */
export const JOIN_GRACE_AFTER_MINUTES = 15;

export type SessionJoinWindow = {
  opensAt: Date;
  closesAt: Date;
  isOpen: boolean;
  isTooEarly: boolean;
  isPast: boolean;
};

export function getSessionJoinWindow(
  scheduledAt: Date,
  scheduledEndAt: Date | null,
  durationMinutes: number,
): SessionJoinWindow {
  const startMs = scheduledAt.getTime();
  const endMs =
    scheduledEndAt?.getTime() ?? startMs + durationMinutes * 60_000;
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

export function formatJoinOpensMessage(opensAt: Date): string {
  return `Video room opens at ${opensAt.toLocaleString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} (${JOIN_EARLY_MINUTES} min before your slot).`;
}
