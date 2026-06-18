import { useEffect, useMemo, useState } from "react";
import { useListReferrals, getListReferralsQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import { CompanyReferralRequestCard } from "@/components/referrals/company-referral-request-card";
import { JobReferralRequestCard } from "@/components/referrals/job-referral-request-card";
import { useSyncPoints } from "@/hooks/use-sync-points";
import { PageHeader, DashboardCard } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { companyReferralApi, COMPANY_REFERRAL_QUERY_KEYS } from "@/lib/company-referral-api";
import type { CompanyReferralRequestResult } from "@/lib/company-referral-api";
import { DEMO_COMPANY_REFERRALS, DEMO_JOB_REFERRALS } from "@/lib/referrals-track-demo";
import {
  filterTrackRequestItems,
  sortTrackRequestItems,
  type TrackRequestFilter,
} from "@/lib/track-request-sort";

const IN_PROGRESS_STATUSES = new Set(["accepted", "referred", "interviewing"]);

function companyWorkflowStatus(request: CompanyReferralRequestResult): string {
  if (request.workflowStatus) return request.workflowStatus;
  if (request.acceptedByReferrerId) return "accepted";
  if (request.status === "declined" || request.status === "closed") return "rejected";
  return request.status;
}

function isCompanyPending(request: CompanyReferralRequestResult): boolean {
  return companyWorkflowStatus(request) === "pending" && !request.acceptedByReferrerId;
}

const FILTER_EMPTY_COPY: Record<Exclude<TrackRequestFilter, "all">, string> = {
  pending: "No pending requests right now.",
  in_progress: "Nothing in progress — alumni haven't accepted yet or requests are already closed.",
  hired: "No hires yet. Keep going!",
};

/** Referral requests you sent — job-wise and company-wise */
export default function Referrals() {
  const [location, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<TrackRequestFilter>("all");
  const syncPoints = useSyncPoints();
  const demoPreview = useMemo(() => {
    const qs = location.includes("?") ? location.slice(location.indexOf("?")) : "";
    return new URLSearchParams(qs).get("demo") === "1";
  }, [location]);

  const { data: myRequests, isLoading: jobsLoading } = useListReferrals(
    { role: "requester" },
    {
      query: {
        queryKey: getListReferralsQueryKey({ role: "requester" }),
        enabled: !demoPreview,
      },
    },
  );

  const { data: companyRequests, isLoading: companyLoading } = useQuery({
    queryKey: COMPANY_REFERRAL_QUERY_KEYS.mine,
    queryFn: () => companyReferralApi.listMine(),
    enabled: !demoPreview,
  });

  const isLoading = !demoPreview && (jobsLoading || companyLoading);
  const jobItems = demoPreview ? DEMO_JOB_REFERRALS : (myRequests ?? []);
  const companyItems = demoPreview ? DEMO_COMPANY_REFERRALS : (companyRequests?.items ?? []);

  const stats = useMemo(() => {
    const jobPending = jobItems.filter((r) => r.status === "pending").length;
    const companyPending = companyItems.filter(isCompanyPending).length;
    const jobInProgress = jobItems.filter((r) => IN_PROGRESS_STATUSES.has(r.status)).length;
    const companyInProgress = companyItems.filter((r) =>
      IN_PROGRESS_STATUSES.has(companyWorkflowStatus(r)),
    ).length;
    const hired =
      jobItems.filter((r) => r.status === "hired").length +
      companyItems.filter((r) => companyWorkflowStatus(r) === "hired").length;

    return {
      total: jobItems.length + companyItems.length,
      pending: jobPending + companyPending,
      inProgress: jobInProgress + companyInProgress,
      hired,
      company: companyItems.length,
      jobs: jobItems.length,
    };
  }, [jobItems, companyItems]);

  const sortedItems = useMemo(
    () => sortTrackRequestItems(companyItems, jobItems),
    [companyItems, jobItems],
  );

  const visibleItems = useMemo(
    () => filterTrackRequestItems(sortedItems, statusFilter),
    [sortedItems, statusFilter],
  );

  useEffect(() => {
    if (!demoPreview) void syncPoints();
  }, [demoPreview]);

  const toggleDemo = () => {
    if (demoPreview) {
      setLocation("/referrals");
    } else {
      setLocation("/referrals?demo=1");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          isLoading
            ? "Loading requests you sent…"
            : demoPreview
              ? "Sample preview — 2 company + 2 job requests."
              : stats.total === 0
                ? "When you ask alumni to refer you, every request appears here."
                : "Follow progress, read updates, and chat with alumni."
        }
      />

      {!isLoading && stats.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total requests"
            value={stats.total}
            icon={ListChecks}
            sublabel={`${stats.jobs} job · ${stats.company} company`}
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            highlight={stats.pending > 0}
            sublabel={stats.pending > 0 ? "Waiting for alumni" : "None waiting"}
            active={statusFilter === "pending"}
            onClick={() => setStatusFilter("pending")}
          />
          <StatCard
            label="In progress"
            value={stats.inProgress}
            icon={TrendingUp}
            highlight={stats.inProgress > 0}
            sublabel="Accepted → interview"
            active={statusFilter === "in_progress"}
            onClick={() => setStatusFilter("in_progress")}
          />
          <StatCard
            label="Hired"
            value={stats.hired}
            icon={CheckCircle2}
            highlight={stats.hired > 0}
            sublabel={stats.hired > 0 ? "Congratulations!" : "Not yet"}
            active={statusFilter === "hired"}
            onClick={() => setStatusFilter("hired")}
          />
        </div>
      )}

      {demoPreview && (
        <DashboardCard className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-dashed border-primary/30 bg-primary/5">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Preview mode</span> — sample cards only.
          </p>
          <Button variant="outline" size="sm" onClick={toggleDemo}>
            Exit preview
          </Button>
        </DashboardCard>
      )}

      {!demoPreview && !isLoading && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" asChild>
            <Link href="/home">
              <Briefcase className="h-3.5 w-3.5" />
              Find more openings
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={toggleDemo}>
            <Building2 className="h-3.5 w-3.5" />
            Preview samples
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : stats.total === 0 ? (
        <DashboardCard className="text-center py-12">
          <h3 className="font-medium">No requests sent yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md mx-auto">
            On Dashboard, use <strong>Companies</strong> for a company-wide request or <strong>Jobs</strong> for a
            specific opening. Track everything here.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/home">Go to Dashboard</Link>
            </Button>
            <Button variant="secondary" size="sm" onClick={toggleDemo}>
              Preview sample cards
            </Button>
          </div>
        </DashboardCard>
      ) : visibleItems.length === 0 ? (
        <DashboardCard className="text-center py-10">
          <p className="text-sm text-muted-foreground">
            {statusFilter === "all"
              ? "No requests to show."
              : FILTER_EMPTY_COPY[statusFilter]}
          </p>
          {statusFilter !== "all" && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setStatusFilter("all")}>
              Show all requests
            </Button>
          )}
        </DashboardCard>
      ) : (
        <div className="flex flex-col gap-4">
          {visibleItems.map((item) =>
            item.kind === "company" ? (
              <CompanyReferralRequestCard
                key={`company-${item.request.id}`}
                request={item.request}
                showChat={!demoPreview}
              />
            ) : (
              <JobReferralRequestCard
                key={`job-${item.referral.id}`}
                referral={item.referral}
                showChat={!demoPreview}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
