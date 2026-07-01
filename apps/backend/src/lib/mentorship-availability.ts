export type WeeklyAvailabilityBlock = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export const DEFAULT_MENTOR_AVAILABILITY: WeeklyAvailabilityBlock[] = [];

/** True when mentor saved at least one weekly hours block in profile. */
export function hasConfiguredAvailability(
  blocks?: WeeklyAvailabilityBlock[] | null,
): boolean {
  return Array.isArray(blocks) && blocks.length > 0;
}

/** Only use hours the mentor saved — no fake defaults. */
export function resolveConsultantAvailability(
  blocks?: WeeklyAvailabilityBlock[] | null,
): WeeklyAvailabilityBlock[] {
  if (!hasConfiguredAvailability(blocks)) return [];
  return blocks!;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatWeeklyAvailabilitySummary(
  blocks: WeeklyAvailabilityBlock[],
): string[] {
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

export type MentorSlot = {
  startAt: string;
  endAt: string;
  durationMinutes: number;
};

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Generate bookable slots from weekly blocks (local server timezone — default IST on deploy). */
export function generateSlotsFromAvailability(params: {
  availability: WeeklyAvailabilityBlock[];
  durationMinutes: number;
  from: Date;
  to: Date;
  bookedStarts: Date[];
}): MentorSlot[] {
  const { availability, durationMinutes, from, to, bookedStarts } = params;
  if (!availability.length || durationMinutes <= 0) return [];

  const bookedSet = new Set(bookedStarts.map((d) => d.getTime()));
  const slots: MentorSlot[] = [];
  const now = Date.now();
  const minLeadMs = 60 * 60 * 1000;

  for (let day = startOfLocalDay(from); day <= to; day = addMinutes(day, 24 * 60)) {
    const dow = day.getDay();
    const blocks = availability.filter((b) => b.dayOfWeek === dow);
    for (const block of blocks) {
      const startMin = parseTimeToMinutes(block.startTime);
      const endMin = parseTimeToMinutes(block.endTime);
      for (let cursor = startMin; cursor + durationMinutes <= endMin; cursor += durationMinutes) {
        const slotStart = new Date(day);
        slotStart.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
        if (slotStart < from || slotStart > to) continue;
        if (slotStart.getTime() < now + minLeadMs) continue;
        if (bookedSet.has(slotStart.getTime())) continue;
        const slotEnd = addMinutes(slotStart, durationMinutes);
        slots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          durationMinutes,
        });
      }
    }
  }

  return slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
}
