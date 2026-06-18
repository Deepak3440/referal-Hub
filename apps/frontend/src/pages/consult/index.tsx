import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { consultApi, CONSULT_QUERY_KEYS, type Consultation } from "@/lib/consult-api";
import { ConsultBookDialog } from "@/components/consult/consult-book-dialog";
import { ConsultSessionsTable } from "@/components/consult/consult-sessions-table";
import { MentorListCard } from "@/components/consult/mentor-list-card";
import { MentorFiltersBar, MentorTabBar } from "@/components/consult/mentor-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, UserSearch } from "lucide-react";
import type { MentorFilters } from "@/lib/mentor-utils";
import { LeaderboardCard } from "@/components/profile/referral-stats-card";
import { referralStatsApi, REFERRAL_STATS_QUERY_KEYS } from "@/lib/referral-stats-api";
import { PageHeader, DashboardCard } from "@/components/layout/page-header";

type Tab = "experts" | "sessions";

const EMPTY_FILTERS: MentorFilters = { q: "", branch: "", college: "", graduationYear: "" };

export default function ConsultPage() {
  const [location] = useLocation();
  const [tab, setTab] = useState<Tab>("experts");
  const [bookTarget, setBookTarget] = useState<Consultation | null>(null);
  const [filters, setFilters] = useState<MentorFilters>(EMPTY_FILTERS);
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeFilters = useMemo(
    () => ({
      q: filters.q || undefined,
      branch: filters.branch || undefined,
      college: filters.college || undefined,
      graduationYear: filters.graduationYear || undefined,
    }),
    [filters],
  );

  const { data: meetConfig } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.meetConfig,
    queryFn: () => consultApi.getMeetConfig(),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "sessions") setTab("sessions");
  }, [location]);

  const { data: experts, isLoading: expertsLoading } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.experts(activeFilters),
    queryFn: () => consultApi.listExperts(activeFilters),
  });

  const mentors = experts ?? [];

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.list("all"),
    queryFn: () => consultApi.listConsultations("all"),
    refetchInterval: 10000,
  });

  const { data: leaderboard } = useQuery({
    queryKey: REFERRAL_STATS_QUERY_KEYS.leaderboard("hires"),
    queryFn: () => referralStatsApi.getTopAlumni("hires", 5),
  });

  const updateMutation = useMutation({
    mutationFn: (args: {
      id: number;
      status: "scheduled" | "rejected" | "completed" | "cancelled";
      scheduledAt?: string;
      durationMinutes?: number;
      meetingLink?: string;
    }) => consultApi.updateConsultation(args.id, args),
    onSuccess: (data) => {
      if (data.status === "scheduled") {
        toast({
          title: "Session booked",
          description: data.meetingLink
            ? "Google Meet link is ready."
            : "Session scheduled.",
        });
      } else if (data.status === "rejected") {
        toast({ title: "Request declined" });
      } else {
        toast({ title: `Session ${data.status}` });
      }
      queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.list("all") });
      setBookTarget(null);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const pendingIncoming =
    sessions?.filter((s) => s.consultantId === me?.id && s.status === "pending").length ?? 0;

  const groupedSessions = useMemo(() => {
    const list = sessions ?? [];
    return {
      pending: list.filter((s) => s.status === "pending"),
      scheduled: list.filter((s) => s.status === "scheduled"),
      done: list.filter((s) => ["completed", "rejected", "cancelled"].includes(s.status)),
    };
  }, [sessions]);

  return (
    <div className="space-y-4">
      <PageHeader description="Connect with experienced alumni and grow in your career." />

      <DashboardCard className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <MentorTabBar
            tab={tab}
            onTabChange={setTab}
            mentorCount={mentors.length}
            sessionCount={sessions?.length ?? 0}
            pendingSessions={pendingIncoming}
          />
        </div>

      {tab === "experts" && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <div className="space-y-4 border-b xl:border-b-0 xl:border-r border-border/60 p-4 sm:p-5 min-w-0">
            <MentorFiltersBar
              filters={filters}
              onChange={setFilters}
              resultCount={mentors.length}
            />

            {expertsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[200px] rounded-xl" />
                ))}
              </div>
            ) : mentors.length > 0 ? (
              <div className="space-y-3">
                {mentors.map((user) => (
                  <MentorListCard key={user.id} user={user} currentUserId={me?.id} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/10 text-center py-12 px-6">
                <UserSearch className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium text-sm">No mentors match your search</p>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
                  Try clearing filters or check back when more alumni join as consultants.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-full"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>

          <aside className="space-y-4 p-4 sm:p-5 xl:sticky xl:top-20 xl:self-start min-w-0">
            <LeaderboardCard embedded items={leaderboard?.items ?? []} title="Top referrers" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Book a 1:1 with an alumni mentor. Session updates appear under{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setTab("sessions")}
              >
                My sessions
              </button>
              .
            </p>
          </aside>
        </div>
      )}

      {tab === "sessions" && (
        <div className="space-y-4 p-4 sm:p-5">
          {sessionsLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : sessions && sessions.length > 0 ? (
            <>
              <ConsultSessionsTable
                title="Pending requests"
                sessions={groupedSessions.pending}
                meId={me?.id ?? 0}
                onRespond={setBookTarget}
                onCancel={(id) => updateMutation.mutate({ id, status: "cancelled" })}
                onComplete={(id) => updateMutation.mutate({ id, status: "completed" })}
                actionsDisabled={updateMutation.isPending}
              />
              <ConsultSessionsTable
                title="Upcoming sessions"
                sessions={groupedSessions.scheduled}
                meId={me?.id ?? 0}
                onCancel={(id) => updateMutation.mutate({ id, status: "cancelled" })}
                onComplete={(id) => updateMutation.mutate({ id, status: "completed" })}
                actionsDisabled={updateMutation.isPending}
              />
              <ConsultSessionsTable
                title="Past sessions"
                sessions={groupedSessions.done}
                meId={me?.id ?? 0}
                onCancel={(id) => updateMutation.mutate({ id, status: "cancelled" })}
                onComplete={(id) => updateMutation.mutate({ id, status: "completed" })}
                actionsDisabled={updateMutation.isPending}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/10 text-center py-12 px-6">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium text-sm">No sessions yet</p>
              <p className="text-xs text-muted-foreground mt-1.5 mb-4">
                Find a mentor and book your first 1:1 call.
              </p>
              <Button className="rounded-full" size="sm" onClick={() => setTab("experts")}>
                Find mentors
              </Button>
            </div>
          )}
        </div>
      )}
      </DashboardCard>

      {bookTarget && (
        <ConsultBookDialog
          open={Boolean(bookTarget)}
          onOpenChange={(o) => !o && setBookTarget(null)}
          requesterName={bookTarget.requester?.fullName ?? "User"}
          autoMeetEnabled={meetConfig?.autoMeetEnabled ?? false}
          onBook={async (scheduledAt, durationMinutes, meetingLink) => {
            await updateMutation.mutateAsync({
              id: bookTarget.id,
              status: "scheduled",
              scheduledAt,
              durationMinutes,
              meetingLink,
            });
          }}
          onReject={async () => {
            await updateMutation.mutateAsync({ id: bookTarget.id, status: "rejected" });
          }}
        />
      )}
    </div>
  );
}
