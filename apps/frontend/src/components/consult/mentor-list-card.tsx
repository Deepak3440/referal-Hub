import type { UserProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  Briefcase,
  Calendar,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
} from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { ConsultRequestDialog } from "@/components/consult/consult-request-dialog";
import { consultApi, CONSULT_QUERY_KEYS } from "@/lib/consult-api";
import {
  formatExperienceYears,
  getMentorCardSummary,
  hasMentorshipSessionOffer,
} from "@/lib/mentor-utils";
import { avatarBgClass } from "@/lib/avatar-colors";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  user: UserProfile;
  currentUserId?: number;
};

function stopCardClick(e: React.MouseEvent | React.KeyboardEvent) {
  e.stopPropagation();
}

function companyInitial(company: string): string {
  return company.trim().charAt(0).toUpperCase() || "?";
}

function formatExperienceLabel(years: number | null): string | null {
  if (years == null) return null;
  if (years === 0) return "Fresher";
  return `${years}+ Years Experience`;
}

export function MentorListCard({ user, currentUserId }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const summary = getMentorCardSummary(user);
  const hasSession = hasMentorshipSessionOffer(user);
  const sessionMinutes = user.mentorshipDurationMinutes ?? 0;
  const sessionPrice = user.mentorshipPriceInr ?? 0;

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
          className="h-11 w-full rounded-xl font-semibold shadow-sm"
          disabled={requestConsult.isPending}
          onClick={stopCardClick}
        >
          <Calendar className="h-4 w-4 mr-2 shrink-0" />
          Book a Session
        </Button>
      }
    />
  );

  const priceLabel =
    sessionPrice > 0 ? `₹${sessionPrice.toLocaleString("en-IN")}` : "Free";
  const experienceLabel = formatExperienceLabel(summary.experienceYears);

  return (
    <article
      className={cn(
        "group rounded-2xl border border-border/80 bg-card overflow-hidden",
        "shadow-sm hover:shadow-md hover:border-primary/25 transition-all duration-200",
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        {/* Left — profile */}
        <div className="flex flex-1 gap-4 sm:gap-5 p-5 sm:p-6 min-w-0">
          <div className="relative shrink-0">
            <UserAvatar
              fullName={user.fullName}
              avatarUrl={user.avatarUrl}
              cacheKey={user.id}
              className="h-[72px] w-[72px] sm:h-20 sm:w-20 ring-2 ring-border shadow-md"
              fallbackClassName="bg-gradient-to-br from-primary to-violet-600 text-primary-foreground font-bold text-xl"
            />
            {canBook && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Available
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openDetail}
                className="font-bold text-lg leading-tight text-foreground hover:text-primary transition-colors text-left"
              >
                {user.fullName}
              </button>
              <BadgeCheck className="h-5 w-5 text-primary shrink-0" aria-label="Verified mentor" />
            </div>

            {(summary.role || summary.company) && (
              <div className="flex items-center gap-2 min-w-0">
                {summary.company && (
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white",
                      avatarBgClass(summary.company),
                    )}
                  >
                    {companyInitial(summary.company)}
                  </span>
                )}
                <p className="text-sm text-muted-foreground truncate">
                  {summary.role && summary.company
                    ? `${summary.role} @ ${summary.company}`
                    : summary.role || summary.company}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {experienceLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  {experienceLabel}
                </span>
              )}
              {summary.college && (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{summary.college}</span>
                </span>
              )}
              {summary.passoutYear != null && (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  Batch {summary.passoutYear}
                </span>
              )}
            </div>

            {user.skills && user.skills.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Specialisations
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user.skills.slice(0, 6).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/15"
                    >
                      {skill}
                    </span>
                  ))}
                  {user.skills.length > 6 && (
                    <span className="text-xs text-muted-foreground self-center px-1">
                      +{user.skills.length - 6}
                    </span>
                  )}
                </div>
              </div>
            )}

            {summary.about && (
              <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                {summary.about}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-1 lg:hidden" onClick={stopCardClick} onKeyDown={stopCardClick}>
              {hasSession && sessionMinutes > 0 && (
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Session Charge</p>
                  <p className="text-xl font-bold text-foreground">
                    {priceLabel}
                    <span className="text-sm font-normal text-muted-foreground"> / session</span>
                  </p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {sessionMinutes} min session
                  </p>
                </div>
              )}
              {bookButton}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-primary"
                onClick={(e) => {
                  stopCardClick(e);
                  openDetail();
                }}
              >
                View profile
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right — booking panel */}
        <div
          className={cn(
            "hidden lg:flex flex-col justify-center gap-4 shrink-0",
            "px-6 py-6 border-l border-border/60 bg-muted/20 min-w-[220px] max-w-[240px]",
          )}
          onClick={stopCardClick}
          onKeyDown={stopCardClick}
        >
          {hasSession && sessionMinutes > 0 && (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium">Session length</span>
                </div>
                <p className="text-2xl font-bold text-foreground leading-none">{sessionMinutes} min</p>
              </div>

              <div className="h-px bg-border/80" />

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Session Charge</p>
                <p className="text-2xl font-bold text-foreground leading-tight">
                  {priceLabel}
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">per session</span>
                </p>
              </div>
            </>
          )}

          {bookButton}

          <button
            type="button"
            onClick={openDetail}
            className="text-xs font-medium text-primary hover:underline text-center"
          >
            View full profile
          </button>
        </div>
      </div>
    </article>
  );
}
