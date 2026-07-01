import type { UserProfile } from "@workspace/api-client-react";
import { Clock, Trophy } from "lucide-react";
import { formatMentorshipSession, hasMentorshipSessionOffer } from "@/lib/mentor-utils";
import { cn } from "@/lib/utils";

type Props = {
  profile: Pick<UserProfile, "mentorshipDurationMinutes" | "mentorshipPriceInr">;
  className?: string;
  compact?: boolean;
  variant?: "default" | "onPrimary";
};

export function MentorshipSessionOffer({ profile, className, compact, variant = "default" }: Props) {
  if (!hasMentorshipSessionOffer(profile)) return null;

  const label = formatMentorshipSession(profile);
  if (!label) return null;

  const minutes = profile.mentorshipDurationMinutes!;
  const price = profile.mentorshipPriceInr ?? 0;
  const isFree = price <= 0;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold",
          className,
        )}
      >
        <Clock className="h-3 w-3 shrink-0" />
        {label}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2",
        variant === "onPrimary"
          ? "border-white/25 bg-white/15 text-primary-foreground"
          : "border-primary/20 bg-primary/5",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium",
          variant === "onPrimary" ? "text-primary-foreground" : "text-foreground",
        )}
      >
        <Clock className={cn("h-4 w-4 shrink-0", variant === "onPrimary" ? "text-white" : "text-primary")} />
        {minutes} min session
      </span>
      <span className={cn("text-xs", variant === "onPrimary" ? "text-white/70" : "text-muted-foreground")}>
        ·
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-sm font-semibold",
          variant === "onPrimary" ? "text-white" : "text-primary",
        )}
      >
        {isFree ? (
          "Free"
        ) : (
          <>
            <Trophy className="h-3.5 w-3.5" />
            {price} pts / session
          </>
        )}
      </span>
    </div>
  );
}
