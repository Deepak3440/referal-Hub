import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useGetJob, getGetJobQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RequestReferralDialog } from "@/components/referrals/request-referral-dialog";
import { ReferralProgressView } from "@/components/referrals/referral-progress-view";
import { ReferralRequestNotice } from "@/components/referrals/referral-request-actions";
import { canSendReferralRequest } from "@/lib/referral";
import { JobDetailsCard } from "@/components/jobs/job-details-card";
import { ReferralChatPanel } from "@/components/messages/referral-chat-panel";
import { DashboardCard } from "@/components/layout/page-header";
import { useSubmitReferral } from "@/hooks/use-submit-referral";
import { useCanAffordReferral } from "@/hooks/use-can-afford-referral";
import {
  formatStageTransferRequester,
  formatPipelineSummary,
} from "@/lib/referral-points";
import { useMyReferralForJob } from "@/hooks/use-my-referral-for-job";
import { useSyncPoints } from "@/hooks/use-sync-points";
import { buildConversationId } from "@/lib/conversation";
import { getApiErrorMessage } from "@/lib/api-error";
import { useGetMe } from "@workspace/api-client-react";

export default function JobDetail() {
  const [matched, params] = useRoute("/jobs/:id");
  const jobId = matched ? parseInt(params?.id ?? "0", 10) : 0;

  const { data: job, isLoading: jobLoading, isError, refetch, isFetching } = useGetJob(jobId, {
    query: {
      enabled: matched && jobId > 0,
      queryKey: getGetJobQueryKey(jobId),
      staleTime: 0,
      refetchOnMount: "always",
    },
  });

  const { toast } = useToast();
  const { data: me } = useGetMe();
  const syncPoints = useSyncPoints();
  const { submit, isPending } = useSubmitReferral(jobId);
  const { canAfford, hint, balance, snapshot, pipeline, pointsEnabled } = useCanAffordReferral(
    job?.rewardPoints ?? 0,
  );
  const referral = useMyReferralForJob(jobId, job);

  useEffect(() => {
    void syncPoints();
  }, [jobId]);

  const waitingForReferral =
    referral.isLoading && !job?.myReferralStatus && !job?.myReferral;

  if (!matched || jobId <= 0) {
    return (
      <div className="text-center space-y-3">
        <p className="text-muted-foreground">Invalid job link.</p>
        <Link href="/home" className="text-sm text-primary hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  if (jobLoading || isFetching && !job) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center space-y-3">
        <p className="text-muted-foreground">
          {isError ? "Could not load this job. Please try again." : "Job not found."}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        <div>
          <Link href="/home" className="text-sm text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const isOwnJob = job.isOwnJob ?? false;

  if (isOwnJob) {
    return (
      <div className="space-y-5">
        <Link href="/my-listings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Offer Referrals
        </Link>
        <DashboardCard className="p-4 text-sm">
          This is your referral opening. Manage incoming requests from <strong>Offer Referrals → Manage Referrals</strong>.
        </DashboardCard>
        <JobDetailsCard job={job} />
        <Button asChild>
          <Link href="/my-listings">Go to Offer Referrals</Link>
        </Button>
      </div>
    );
  }

  const handleRequestReferral = async (note: string) => {
    try {
      await submit(note);
      await refetch();
      toast({
        title: "Request sent — Pending",
        description: pointsEnabled
          ? formatStageTransferRequester(job.rewardPoints, "request").replace(
              " to poster",
              ` to ${job.poster.fullName}`,
            ) + ". Chat opens to ask questions."
          : `Request sent to ${job.poster.fullName}. Chat opens to ask questions.`,
      });
    } catch (err) {
      toast({
        title: getApiErrorMessage(err, "Failed to send request"),
        variant: "destructive",
      });
      throw err;
    }
  };

  const showProgress = referral.hasReferral || Boolean(job.myReferralStatus);

  return (
    <div className="space-y-5">
      <Link
        href={showProgress ? "/referrals" : "/home"}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {showProgress ? "Back to Track Requests" : "Back to Dashboard"}
      </Link>

      {showProgress && (
        <>
          <ReferralProgressView
            status={referral.status}
            posterName={referral.posterName}
            jobTitle={job.title}
            company={job.company}
            rewardPoints={job.rewardPoints}
            note={referral.note}
            pointsPaid={referral.pointsPaid}
            requestedAt={referral.createdAt}
          />
          {!canSendReferralRequest(referral.status) && (
            <ReferralRequestNotice status={referral.status} />
          )}
        </>
      )}

      {showProgress && me && (
        <ReferralChatPanel
          conversationId={buildConversationId(me.id, job.posterId)}
          otherUserName={job.poster.fullName}
          jobTitle={job.title}
          defaultOpen
        />
      )}

      {!showProgress && !waitingForReferral && (
        <DashboardCard className="p-5 text-center space-y-3 border-dashed">
          <p className="text-sm text-muted-foreground">
            You haven&apos;t requested a referral for this job yet.
          </p>
          <p className="text-xs text-muted-foreground">
            One request per job opening. If declined, you cannot send again for the same role.
          </p>
          {pointsEnabled && job.rewardPoints > 0 && (
            <p className="text-xs text-muted-foreground">{formatPipelineSummary(job.rewardPoints)}</p>
          )}
          <RequestReferralDialog
            jobTitle={job.title}
            company={job.company}
            posterName={job.poster.fullName}
            isPending={isPending}
            canAfford={canAfford || !pointsEnabled}
            pointsHint={pointsEnabled ? hint : undefined}
            requiredPoints={snapshot.newRequestPipeline}
            balancePoints={balance}
            rewardPoints={job.rewardPoints}
            pipeline={pipeline}
            onSubmit={handleRequestReferral}
          />
        </DashboardCard>
      )}

      <JobDetailsCard job={job} compact={showProgress} />

      {showProgress && (
        <p className="text-center text-xs text-muted-foreground pb-4">
          Status updates when <strong>{job.poster.fullName}</strong> accepts, refers, or hires you.
        </p>
      )}
    </div>
  );
}
