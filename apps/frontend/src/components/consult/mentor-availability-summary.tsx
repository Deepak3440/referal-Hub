import { CalendarClock } from "lucide-react";
import type { UserProfile } from "@workspace/api-client-react";
import { formatWeeklyAvailabilityLines, hasMentorAvailabilityConfigured } from "@/lib/mentor-utils";
import type { WeeklyAvailabilityBlock } from "@/lib/consult-api";

type Props = {
  profile: UserProfile;
  openSlotCount?: number;
  compact?: boolean;
};

export function MentorAvailabilitySummary({ profile, openSlotCount, compact }: Props) {
  const blocks = (
    profile as UserProfile & { mentorshipWeeklyAvailability?: WeeklyAvailabilityBlock[] }
  ).mentorshipWeeklyAvailability ?? [];

  if (!hasMentorAvailabilityConfigured(profile)) {
    return (
      <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-50/50 px-3 py-2.5 text-sm text-amber-900">
        <p className="font-medium">Availability not set</p>
        <p className="text-xs text-amber-800/90 mt-0.5">
          This mentor has not added weekly hours yet — booking opens after they update their profile.
        </p>
      </div>
    );
  }

  const lines = formatWeeklyAvailabilityLines(blocks);

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CalendarClock className="h-4 w-4 text-primary shrink-0" />
        Weekly hours
      </div>
      <ul className={compact ? "text-xs text-muted-foreground space-y-0.5" : "text-sm text-muted-foreground space-y-1"}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {openSlotCount != null && (
        <p className="text-xs text-emerald-700 font-medium">
          {openSlotCount > 0
            ? `${openSlotCount} open slot${openSlotCount === 1 ? "" : "s"} in the next 2 weeks`
            : "Fully booked for the next 2 weeks — check back later"}
        </p>
      )}
    </div>
  );
}
