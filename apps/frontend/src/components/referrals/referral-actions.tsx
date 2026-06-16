import { Button } from "@/components/ui/button";
import {
  formatStageTransferPoster,
  type RewardStage,
} from "@/lib/referral-points";
import { type ReferralStatus } from "@/lib/referral";

type ReferralActionsProps = {
  status: string;
  rewardPoints?: number;
  disabled?: boolean;
  onUpdate: (status: ReferralStatus) => void;
  compact?: boolean;
};

function actionHint(rewardPoints: number, stage: RewardStage | null): string | undefined {
  if (!stage || rewardPoints <= 0) return undefined;
  return formatStageTransferPoster(rewardPoints, stage);
}

export function ReferralActions({
  status,
  rewardPoints = 0,
  disabled,
  onUpdate,
  compact,
}: ReferralActionsProps) {
  const ActionBtn = ({
    label,
    onClick,
    variant = "default" as const,
    hint,
  }: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "destructive";
    hint?: string;
  }) => (
    <div className={compact ? "flex flex-col gap-0.5" : "flex flex-col items-end gap-0.5"}>
      <Button
        variant={variant}
        size="sm"
        className={compact ? "h-8 text-xs rounded-full" : undefined}
        onClick={onClick}
        disabled={disabled}
      >
        {label}
      </Button>
      {hint && !compact && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );

  const s = status as ReferralStatus;

  if (s === "pending") {
    return (
      <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2 justify-end"}>
        <ActionBtn label="Reject" variant="outline" onClick={() => onUpdate("rejected")} />
        <ActionBtn label="Accept" onClick={() => onUpdate("accepted")} hint={actionHint(rewardPoints, "accepted")} />
      </div>
    );
  }
  if (s === "accepted") {
    return (
      <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2 justify-end"}>
        <ActionBtn label="Reject" variant="outline" onClick={() => onUpdate("rejected")} />
        <ActionBtn label="Mark Referred" onClick={() => onUpdate("referred")} hint={actionHint(rewardPoints, "referred")} />
      </div>
    );
  }
  if (s === "referred") {
    return (
      <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2 justify-end"}>
        <ActionBtn label="Reject" variant="outline" onClick={() => onUpdate("rejected")} />
        <ActionBtn
          label="Schedule Interview"
          onClick={() => onUpdate("interviewing")}
          hint={compact ? undefined : "Move to interview stage"}
        />
      </div>
    );
  }
  if (s === "interviewing") {
    return (
      <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2 justify-end"}>
        <ActionBtn label="Not Selected" variant="outline" onClick={() => onUpdate("rejected_after_interview")} />
        <ActionBtn label="Mark Hired" onClick={() => onUpdate("hired")} hint={actionHint(rewardPoints, "hired")} />
      </div>
    );
  }
  return null;
}
