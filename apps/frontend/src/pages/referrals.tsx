import { useEffect, useMemo } from "react";
import { useListReferrals, getListReferralsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { User, Briefcase } from "lucide-react";
import { ReferralStatusBadge } from "@/components/referrals/referral-status-badge";
import { ReferralProgressBar } from "@/components/referrals/referral-progress-bar";
import { ReferralRequestNotice } from "@/components/referrals/referral-request-actions";
import { canSendReferralRequest } from "@/lib/referral";
import { useSyncPoints } from "@/hooks/use-sync-points";
import { PageHeader, DashboardCard } from "@/components/layout/page-header";

const ACTIVE_STATUSES = new Set([
  "accepted",
  "referred",
  "interviewing",
  "hired",
  "rejected_after_interview",
]);

/** Referral requests you sent — track pending, accepted, referred, hired */
export default function Referrals() {
  const syncPoints = useSyncPoints();
  const { data: myRequests, isLoading } = useListReferrals(
    { role: "requester" },
    { query: { queryKey: getListReferralsQueryKey({ role: "requester" }) } },
  );

  const stats = useMemo(() => {
    const items = myRequests ?? [];
    return {
      total: items.length,
      pending: items.filter((r) => r.status === "pending").length,
      inProgress: items.filter((r) => ACTIVE_STATUSES.has(r.status)).length,
    };
  }, [myRequests]);

  useEffect(() => {
    void syncPoints();
  }, []);

  const pageDescription = isLoading
    ? "Loading requests you sent to alumni…"
    : stats.total === 0
      ? "When you ask an alumni to refer you for a job, every request you send appears here — pending, accepted, referred, or hired."
      : `${stats.total} request${stats.total !== 1 ? "s" : ""} you sent · ${stats.pending} waiting on alumni · ${stats.inProgress} accepted or further`;

  return (
    <div className="space-y-6">
      <PageHeader description={pageDescription} />

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : !myRequests || myRequests.length === 0 ? (
        <DashboardCard className="text-center py-12">
          <h3 className="font-medium">No requests sent yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md mx-auto">
            Browse openings on Dashboard, tap <strong>Request referral</strong>, and return here to track whether alumni accept or refer you.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/home">Browse openings</Link>
          </Button>
        </DashboardCard>
      ) : (
        <div className="flex flex-col gap-4">
          {myRequests.map((ref) => (
            <Link key={ref.id} href={`/jobs/${ref.jobId}`} className="block">
              <DashboardCard className="p-4 sm:p-5 space-y-3.5 hover:border-primary/25 hover:shadow-md transition-all cursor-pointer">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Request you sent
                    </p>
                    <div className="flex items-start gap-2 min-w-0">
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="font-semibold min-w-0 line-clamp-2 break-words">
                        {ref.job?.title} · {ref.job?.company}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                      <User className="w-3 h-3 shrink-0" />
                      Requested referral from {ref.referrer?.fullName}
                      <span className="mx-1">·</span>
                      {formatDistanceToNow(new Date(ref.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <ReferralStatusBadge status={ref.status} soft className="self-start sm:self-center shrink-0" />
                </div>
                <ReferralProgressBar status={ref.status} showSteps={false} colored />
                {!canSendReferralRequest(ref.status) && (
                  <ReferralRequestNotice status={ref.status} />
                )}
                {(ref.totalPointsDeducted ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    −{ref.totalPointsDeducted} pts paid by you
                  </p>
                )}
              </DashboardCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
