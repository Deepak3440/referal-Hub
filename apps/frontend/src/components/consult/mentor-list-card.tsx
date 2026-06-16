import type { UserProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, ChevronRight, Clock, Video } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { ConsultRequestDialog } from "@/components/consult/consult-request-dialog";
import { consultApi, CONSULT_QUERY_KEYS } from "@/lib/consult-api";
import {
  formatExperienceYears,
  getMentorCardSummary,
  hasMentorshipSessionOffer,
} from "@/lib/mentor-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  user: UserProfile;
  currentUserId?: number;
};

function stopCardClick(e: React.MouseEvent | React.KeyboardEvent) {
  e.stopPropagation();
}

function sessionLabel(minutes: number, priceInr: number) {
  return `${minutes} min${priceInr <= 0 ? " · Free" : ` · ₹${priceInr.toLocaleString("en-IN")}`}`;
}

export function MentorListCard({ user, currentUserId }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const summary = getMentorCardSummary(user);
  const roleLine = [summary.role, summary.company].filter(Boolean).join(" · ");
  const hasSession = hasMentorshipSessionOffer(user);
  const sessionMinutes = user.mentorshipDurationMinutes ?? 0;
  const sessionPrice = user.mentorshipPriceInr ?? 0;

  const metaParts = [
    summary.experienceYears != null ? formatExperienceYears(summary.experienceYears) : null,
    summary.college,
    summary.stream,
  ].filter(Boolean);

  const isSelf = currentUserId != null && currentUserId === user.id;
  const canBook = user.isConsultant === true && !isSelf;

  const requestConsult = useMutation({
    mutationFn: (message: string) => consultApi.requestConsultation(user.id, message),
    onSuccess: () => {
      toast({
        title: "Mentorship request sent",
        description: "Check My Sessions for updates and your Meet link.",
      });
      queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.list("all") });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const openDetail = () => setLocation(`/consult/${user.id}`);

  const sessionChip = hasSession && sessionMinutes > 0 && (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      {sessionLabel(sessionMinutes, sessionPrice)}
    </div>
  );

  const bookButton = canBook && (
    <ConsultRequestDialog
      consultantName={user.fullName}
      consultantId={user.id}
      onSubmit={async (message) => {
        await requestConsult.mutateAsync(message);
      }}
      trigger={
        <Button
          type="button"
          size="sm"
          className="h-9 w-full rounded-lg px-3"
          disabled={requestConsult.isPending}
          onClick={stopCardClick}
        >
          <Video className="h-3.5 w-3.5 mr-1.5 shrink-0" />
          Book session
        </Button>
      }
    />
  );

  const profileButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-9 w-full rounded-lg px-3 bg-background"
      onClick={(e) => {
        stopCardClick(e);
        openDetail();
      }}
    >
      View profile
      <ChevronRight className="h-3.5 w-3.5 ml-0.5 shrink-0" />
    </Button>
  );

  return (
    <article
      className={cn(
        "group rounded-xl border border-border bg-card overflow-hidden",
        "hover:border-primary/35 hover:shadow-md hover:shadow-primary/5 transition-all duration-200",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <div className="flex flex-1 gap-4 p-4 sm:p-5 min-w-0">
          <UserAvatar
            fullName={user.fullName}
            avatarUrl={user.avatarUrl}
            cacheKey={user.id}
            className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 ring-[3px] ring-primary/15 shadow-sm"
            fallbackClassName="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-lg"
          />

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openDetail}
                className="font-semibold text-base leading-tight text-foreground hover:text-primary transition-colors text-left truncate max-w-full"
              >
                {user.fullName}
              </button>
              <Badge className="h-5 px-1.5 text-[10px] font-semibold border-0 bg-primary/10 text-primary shrink-0">
                <Video className="h-3 w-3 mr-0.5" />
                Mentor
              </Badge>
            </div>

            {roleLine && (
              <p className="text-sm text-muted-foreground leading-snug line-clamp-1">{roleLine}</p>
            )}

            {metaParts.length > 0 && (
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <Briefcase className="h-3 w-3 shrink-0 opacity-60" />
                {metaParts.map((part, i) => (
                  <span key={`${part}-${i}`}>
                    {i > 0 && <span className="text-muted-foreground/35 mr-1.5">·</span>}
                    {part}
                  </span>
                ))}
              </p>
            )}

            {summary.about && (
              <p className="text-sm text-foreground/75 line-clamp-2 leading-relaxed pt-0.5">
                {summary.about}
              </p>
            )}

            {user.skills && user.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {user.skills.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {user.skills.length > 5 && (
                  <span className="text-[11px] text-muted-foreground self-center">
                    +{user.skills.length - 5}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:hidden" onClick={stopCardClick} onKeyDown={stopCardClick}>
              {sessionChip}
              {bookButton}
              {profileButton}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "hidden sm:flex flex-col items-stretch justify-center gap-2 shrink-0",
            "px-4 py-4 border-l border-border/60 bg-muted/15 w-[10.25rem]",
          )}
          onClick={stopCardClick}
          onKeyDown={stopCardClick}
        >
          {sessionChip}
          {bookButton}
          {profileButton}
        </div>
      </div>
    </article>
  );
}
