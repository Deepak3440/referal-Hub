import { Progress } from "@/components/ui/progress";
import { ReferralFlowSteps } from "./referral-flow-steps";
import {
  getReferralProgressLabel,
  getReferralProgressPercent,
  getStatusProgressColor,
  STATUS_LABELS,
  type ReferralStatus,
} from "@/lib/referral";
import { cn } from "@/lib/utils";

type ReferralProgressBarProps = {
  status: string;
  showLabel?: boolean;
  showSteps?: boolean;
  colored?: boolean;
  className?: string;
};

export function ReferralProgressBar({
  status,
  showLabel = true,
  showSteps = true,
  colored = false,
  className,
}: ReferralProgressBarProps) {
  const isRejected = status === "rejected" || status === "rejected_after_interview";
  const percent = getReferralProgressPercent(status);

  return (
    <div className={cn("space-y-3", className)}>
      {showLabel && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span
            className={cn(
              "font-medium",
              colored && isRejected && "text-red-700 dark:text-red-400",
              colored && status === "hired" && "text-emerald-700 dark:text-emerald-400",
            )}
          >
            {isRejected
              ? STATUS_LABELS[status as ReferralStatus]
              : getReferralProgressLabel(status)}
          </span>
          {!isRejected && (
            <span className="text-muted-foreground tabular-nums">{percent}%</span>
          )}
        </div>
      )}
      {!isRejected && (
        <Progress
          value={percent}
          className={cn("h-2", colored && getStatusProgressColor(status))}
        />
      )}
      {showSteps && <ReferralFlowSteps status={status} compact />}
    </div>
  );
}
