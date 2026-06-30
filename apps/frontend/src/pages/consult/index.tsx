import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useInfiniteQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { consultApi, CONSULT_QUERY_KEYS, MENTOR_PAGE_SIZE, type Consultation } from "@/lib/consult-api";
import { ConsultBookDialog } from "@/components/consult/consult-book-dialog";
import { ConsultSessionsTable } from "@/components/consult/consult-sessions-table";
import { MentorListCard } from "@/components/consult/mentor-list-card";
import { MentorFiltersBar, MentorTabBar } from "@/components/consult/mentor-filters";
import { MentorshipHero } from "@/components/consult/mentorship-hero";
import { MentorshipCategoryChips } from "@/components/consult/mentorship-category-chips";
import { MentorshipInfoPanel } from "@/components/consult/mentorship-info-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, UserSearch } from "lucide-react";
import type { MentorFilters } from "@/lib/mentor-utils";

type Tab = "experts" | "sessions";

const EMPTY_FILTERS: MentorFilters = {
  q: "",
  branch: "",
  company: "",
  college: "",
  graduationYear: "",
  category: "",
  experience: "",
  sessionLength: "",
  price: "",
};

export default function ConsultPage() {
  const [location] = useLocation();
  const [tab, setTab] = useState<Tab>("experts");
  const [bookTarget, setBookTarget] = useState<Consultation | null>(null);
  const [filters, setFilters] = useState<MentorFilters>(EMPTY_FILTERS);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const apiFilters = useMemo(
    () => ({
      q: filters.q || undefined,
      branch: filters.branch || undefined,
      company: filters.company || undefined,
      college: filters.college || undefined,
      graduationYear: filters.graduationYear || undefined,
      category: filters.category || undefined,
      experience: filters.experience || undefined,
      sessionLength: filters.sessionLength || undefined,
      price: filters.price || undefined,
      limit: MENTOR_PAGE_SIZE,
    }),
    [
      filters.q,
      filters.branch,
      filters.company,
      filters.college,
      filters.graduationYear,
      filters.category,
      filters.experience,
      filters.sessionLength,
      filters.price,
    ],
  );

  const { data: meetConfig } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.meetConfig,
    queryFn: () => consultApi.getMeetConfig(),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "sessions") setTab("sessions");
  }, [location]);

  const {
    data: expertsPages,
    isLoading: expertsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: CONSULT_QUERY_KEYS.experts(apiFilters),
    queryFn: ({ pageParam }) => consultApi.listExperts({ ...apiFilters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  const mentors = useMemo(
    () => expertsPages?.pages.flatMap((page) => page.items) ?? [],
    [expertsPages],
  );
  const totalMentors = expertsPages?.pages[0]?.total ?? mentors.length;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || tab !== "experts") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [tab, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.list("all"),
    queryFn: () => consultApi.listConsultations("all"),
    refetchInterval: 10000,
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
    <div className="space-y-6 bg-[#F8FAFC] min-h-full -m-4 sm:-m-6 p-4 sm:p-6">
      {tab === "experts" && <MentorshipHero />}

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <MentorTabBar
            tab={tab}
            onTabChange={setTab}
            mentorCount={totalMentors}
            sessionCount={sessions?.length ?? 0}
            pendingSessions={pendingIncoming}
          />
        </div>

        {tab === "experts" && (
          <div className="p-4 sm:p-5 space-y-4">
            <MentorshipCategoryChips
              value={filters.category ?? ""}
              onChange={(category) => setFilters((f) => ({ ...f, category }))}
            />

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6">
              <div className="space-y-4 min-w-0">
                <MentorFiltersBar
                  filters={filters}
                  onChange={setFilters}
                  resultCount={totalMentors}
                />

                {expertsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-[220px] rounded-2xl" />
                    ))}
                  </div>
                ) : mentors.length > 0 ? (
                  <div className="space-y-4">
                    {mentors.map((user) => (
                      <MentorListCard key={user.id} user={user} currentUserId={me?.id} />
                    ))}
                    <div ref={loadMoreRef} className="h-1" aria-hidden />
                    {isFetchingNextPage && (
                      <Skeleton className="h-[220px] rounded-2xl" />
                    )}
                    {hasNextPage && !isFetchingNextPage && (
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => fetchNextPage()}
                        >
                          Load more mentors
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center py-14 px-6">
                    <UserSearch className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-800">No mentors match your search</p>
                    <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
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

              <div className="hidden xl:block">
                <div className="sticky top-20">
                  <MentorshipInfoPanel />
                </div>
              </div>
            </div>

            <div className="xl:hidden">
              <MentorshipInfoPanel />
            </div>
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
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center py-14 px-6">
                <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-800">No sessions yet</p>
                <p className="text-sm text-slate-500 mt-1.5 mb-4">
                  Find a mentor and book your first 1:1 call.
                </p>
                <Button
                  className="rounded-full bg-[#2563EB]"
                  size="sm"
                  onClick={() => setTab("experts")}
                >
                  Find mentors
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

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
