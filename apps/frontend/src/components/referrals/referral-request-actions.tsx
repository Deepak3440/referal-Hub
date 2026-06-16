import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { Job } from "@workspace/api-client-react";
import { RequestReferralDialog } from "@/components/referrals/request-referral-dialog";
import { useCanAffordReferral } from "@/hooks/use-can-afford-referral";
import {
  canSendReferralRequest,
  getReferralBlockedMessage,
  getReferralCtaLabel,
  isClosedReferralStatus,
  type ReferralStatus,
} from "@/lib/referral";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type ReferralRequestActionsProps = {
  job: Job;
  isPending?: boolean;
  onSubmit: (note: string) => Promise<void>;
  buttonSize?: ComponentProps<typeof Button>["size"];
  buttonClassName?: string;
  layout?: "inline" | "stacked";
};

export function ReferralRequestActions({
  job,
  isPending,
  onSubmit,
  buttonSize = "sm",
  buttonClassName,
  layout = "inline",
}: ReferralRequestActionsProps) {
  const status = job.myReferralStatus ?? null;
  const { canAfford, hint, balance, snapshot, pipeline, pointsEnabled } = useCanAffordReferral(
    job.rewardPoints,
  );

  if (!canSendReferralRequest(status)) {
    const closed = isClosedReferralStatus(status!);
    const message = getReferralBlockedMessage(status as ReferralStatus);
    const showMessage = layout === "stacked";

    return (
      <div
        className={cn(
          layout === "stacked" ? "space-y-2 w-full" : "flex flex-col items-end gap-1",
        )}
      >
        {showMessage && (
          <p
            className={cn(
              "text-[11px] leading-snug",
              closed ? "text-red-700/90 dark:text-red-400" : "text-muted-foreground",
              layout === "stacked" ? "text-center" : "text-right",
            )}
          >
            {message}
          </p>
        )}
        <Button
          asChild
          size={buttonSize}
          variant={closed ? "outline" : "default"}
          className={buttonClassName}
        >
          <Link href={`/jobs/${job.id}`}>{getReferralCtaLabel(status as ReferralStatus)}</Link>
        </Button>
      </div>
    );
  }

  return (
    <RequestReferralDialog
      jobTitle={job.title}
      company={job.company}
      posterName={job.poster.fullName}
      isPending={isPending}
      canAfford={canAfford || !pointsEnabled}
      pointsHint={pointsEnabled ? hint : undefined}
      requiredPoints={snapshot.newRequestPipeline}
      balancePoints={balance}
      pipeline={pipeline}
      rewardPoints={job.rewardPoints}
      onSubmit={onSubmit}
      trigger={
        <Button
          size={buttonSize}
          className={cn("shadow-sm", buttonClassName)}
          disabled={isPending || (pointsEnabled && !canAfford)}
          title={pointsEnabled && !canAfford ? hint : undefined}
        >
          {pointsEnabled && !canAfford ? "Not enough pts" : "Request referral"}
        </Button>
      }
    />
  );
}

export function ReferralRequestNotice({ status }: { status: string }) {
  const isRejected = status === "rejected" || status === "rejected_after_interview";
  const isHired = status === "hired";

  return (
    <div
      className={cn(
        "rounded-lg border border-border px-3 py-2.5 text-xs leading-relaxed",
        isRejected && "bg-red-50/50 dark:bg-red-950/20",
        isHired && "bg-success/10",
        !isRejected && !isHired && "bg-muted/25",
      )}
    >
      <span className="font-medium text-foreground/85">One request per job.</span>{" "}
      <span className="text-muted-foreground">
        {getReferralBlockedMessage(status as ReferralStatus)}
      </span>
    </div>
  );
}
