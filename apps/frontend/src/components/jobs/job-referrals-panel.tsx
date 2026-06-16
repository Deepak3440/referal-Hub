import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUpdateReferral,
  useListJobReferrals,
  useGetMe,
  getListReferralsQueryKey,
  getListJobReferralsQueryKey,
  getGetMeQueryKey,
  getGetDashboardStatsQueryKey,
  type Referral,
  type ReferralSummary,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, Inbox, Users } from "lucide-react";
import {
  ReferralRequestRow,
  ReferralFilterTabs,
  filterReferrals,
  referralFilterCounts,
  type ReferralFilter,
} from "@/components/referrals/referral-request-row";
import { type ReferralStatus } from "@/lib/referral";
import {
  formatStageTransferPosterToast,
  rewardStageForStatusUpdate,
} from "@/lib/referral-points";
import { getApiErrorMessage } from "@/lib/api-error";
import { useSyncPoints, type PointsUpdate } from "@/hooks/use-sync-points";
import { cn } from "@/lib/utils";

type ReferralWithPoints = Referral & { pointsUpdate?: PointsUpdate };

export function JobReferralsPanel({
  jobId,
  jobTitle,
  jobRewardPoints = 0,
  defaultOpen = false,
  requestCount = 0,
  embedded = false,
}: {
  jobId: number;
  jobTitle?: string;
  jobRewardPoints?: number;
  defaultOpen?: boolean;
  requestCount?: number;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [filter, setFilter] = useState<ReferralFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterInitialized, setFilterInitialized] = useState(false);

  const { data: me } = useGetMe();
  const { data, isLoading } = useListJobReferrals(jobId, {
    query: { queryKey: getListJobReferralsQueryKey(jobId) },
  });
  const updateReferral = useUpdateReferral();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const syncPoints = useSyncPoints();

  const referrals = data ?? [];
  const counts = useMemo(() => referralFilterCounts(referrals), [referrals]);
  const filtered = useMemo(() => filterReferrals(referrals, filter), [referrals, filter]);
  const total = referrals.length || requestCount;
  const pending = counts.pending;

  useEffect(() => {
    if (!open || expandedId != null) return;
    const firstPending = referrals.find((r) => r.status === "pending");
    if (firstPending) setExpandedId(firstPending.id);
  }, [open, referrals, expandedId]);

  useEffect(() => {
    if (!open || filterInitialized || isLoading) return;
    if (pending > 0) setFilter("pending");
    setFilterInitialized(true);
  }, [open, pending, isLoading, filterInitialized]);

  useEffect(() => {
    if (!open) setFilterInitialized(false);
  }, [open]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListJobReferralsQueryKey(jobId) });
    queryClient.invalidateQueries({ queryKey: getListReferralsQueryKey({ role: "referrer" }) });
    queryClient.invalidateQueries({ queryKey: getListReferralsQueryKey({ role: "requester" }) });
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/jobs/my"] });
  };

  const updateStatus = (referralId: number, status: ReferralStatus) => {
    updateReferral.mutate(
      { referralId, data: { status: status as never } },
      {
        onSuccess: async (data) => {
          const pu = (data as ReferralWithPoints).pointsUpdate;
          await syncPoints(pu);

          const stage = rewardStageForStatusUpdate(status);
          const rewardMsg =
            stage && jobRewardPoints > 0
              ? formatStageTransferPosterToast(jobRewardPoints, stage)
              : undefined;
          const myPts =
            pu && me?.id === pu.referrerId
              ? pu.referrerPoints
              : pu && me?.id === pu.requesterId
                ? pu.requesterPoints
                : undefined;
          toast({
            title: `Status updated to ${status}`,
            description: [rewardMsg, myPts != null ? `Your balance: ${myPts} pts` : undefined]
              .filter(Boolean)
              .join(" · "),
          });
          invalidate();
        },
        onError: (err) => {
          toast({
            title: getApiErrorMessage(err, "Update failed"),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className={embedded ? "pt-2" : "border-t mt-3 pt-3"}>
      <Button
        variant={embedded ? "secondary" : "outline"}
        size="sm"
        className="w-full justify-between h-auto py-2.5 rounded-xl gap-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2 font-medium text-sm min-w-0">
          <Users className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">
            Manage referrals{total > 0 ? ` (${total})` : ""}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-xs flex-wrap justify-end shrink-0">
          {pending > 0 && (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-0">
              {pending} pending
            </Badge>
          )}
          {counts.active > 0 && <Badge variant="secondary">{counts.active} active</Badge>}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </Button>

      {open && (
        <div className="mt-3 space-y-3">
          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : referrals.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 text-center py-8 px-4">
              <Inbox className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                No requests yet. When someone applies, they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <>
              {total > 1 && (
                <ReferralFilterTabs active={filter} onChange={setFilter} counts={counts} />
              )}

              <div
                className={cn(
                  "rounded-xl border bg-card overflow-hidden shadow-sm",
                  filtered.length > 3 && "max-h-[min(70vh,520px)]",
                )}
              >
                <div
                  className={cn(
                    "divide-y divide-border/70",
                    filtered.length > 3 && "overflow-y-auto max-h-[min(70vh,520px)]",
                  )}
                >
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 px-4">
                      No {filter === "all" ? "" : `${filter} `}requests in this tab.
                    </p>
                  ) : (
                    filtered.map((ref) => (
                      <ReferralRequestRow
                        key={ref.id}
                        referral={ref}
                        jobTitle={jobTitle}
                        jobRewardPoints={jobRewardPoints}
                        meId={me?.id ?? 0}
                        expanded={expandedId === ref.id}
                        onToggle={() =>
                          setExpandedId((id) => (id === ref.id ? null : ref.id))
                        }
                        disabled={updateReferral.isPending}
                        onUpdate={(status) => updateStatus(ref.id, status)}
                      />
                    ))
                  )}
                </div>

                {filtered.length > 3 && (
                  <div className="px-3 py-2 border-t bg-muted/30 text-[11px] text-muted-foreground text-center">
                    Scroll to see all {filtered.length} requests
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
