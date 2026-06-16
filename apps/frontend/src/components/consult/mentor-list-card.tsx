import type { UserProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, GraduationCap, MessageCircle, Video } from "lucide-react";
import { formatExperienceYears, getMentorCardSummary } from "@/lib/mentor-utils";
import { MentorshipSessionOffer } from "@/components/consult/mentorship-session-offer";
import { cn } from "@/lib/utils";

export function MentorListCard({ user }: { user: UserProfile }) {
  const [, setLocation] = useLocation();
  const summary = getMentorCardSummary(user);

  const openDetail = () => setLocation(`/consult/${user.id}`);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetail();
        }
      }}
      className={cn(
        "group flex gap-4 p-4 sm:p-5 rounded-xl border border-border bg-card",
        "hover:border-primary/30 hover:shadow-md transition-all cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
    >
      <Avatar className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 ring-2 ring-primary/10">
        <AvatarImage src={user.avatarUrl || undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
          {user.fullName.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-base sm:text-lg leading-tight group-hover:text-primary transition-colors truncate">
              {user.fullName}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {[summary.role, summary.company].filter(Boolean).join(" · ") || "Professional mentor"}
            </p>
          </div>
          <Badge className="bg-primary/10 text-primary border-0 shrink-0 text-[10px]">
            <Video className="h-3 w-3 mr-1" />
            Mentor
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {summary.college && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {summary.college}
            </span>
          )}
          {summary.stream && (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {summary.stream}
            </span>
          )}
          {summary.passoutYear != null && (
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              {summary.passoutYear}
            </span>
          )}
          <span>{formatExperienceYears(summary.experienceYears)}</span>
        </div>

        <MentorshipSessionOffer profile={user} compact />

        {summary.about && (
          <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
            {summary.about}
          </p>
        )}

        {user.skills && user.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {user.skills.slice(0, 3).map((skill) => (
              <span key={skill} className="text-[11px] bg-muted px-2 py-0.5 rounded-full">
                {skill}
              </span>
            ))}
            {user.skills.length > 3 && (
              <span className="text-[11px] text-muted-foreground">+{user.skills.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:flex flex-col justify-center gap-2 shrink-0">
        <Button
          type="button"
          size="sm"
          className="rounded-full px-4 pointer-events-none"
          tabIndex={-1}
        >
          <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
          View profile
        </Button>
      </div>
    </article>
  );
}
