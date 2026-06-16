import { ReferralStatusBadge } from "./referral-status-badge";
import {
  FLOW_STEPS,
  STATUS_LABELS,
  getReferralProgressPercent,
  isClosedReferralStatus,
  type ReferralStatus,
} from "@/lib/referral";
import {
  formatStageTransferRequester,
  rewardStageForRequesterStatus,
} from "@/lib/referral-points";
import { Coins, Clock, User, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type ReferralProgressViewProps = {
  status: string;
  posterName: string;
  jobTitle: string;
  company: string;
  rewardPoints?: number;
  note?: string | null;
  pointsPaid?: number;
  requestedAt?: string;
};

export function ReferralProgressView({
  status,
  posterName,
  jobTitle,
  company,
  rewardPoints = 0,
  note,
  pointsPaid = 0,
  requestedAt,
}: ReferralProgressViewProps) {
  const percent = getReferralProgressPercent(status);
  const isRejected = status === "rejected" || status === "rejected_after_interview";
  const isClosed = isClosedReferralStatus(status);
  const currentIdx = FLOW_STEPS.findIndex((s) => s.key === status);

  const requesterRewardHint = (() => {
    const stage = rewardStageForRequesterStatus(status);
    if (!stage || rewardPoints <= 0) return null;
    return formatStageTransferRequester(rewardPoints, stage);
  })();

  const posterStatusLine = (() => {
    if (status === "pending") return `Sent to ${posterName} — waiting for accept or decline`;
    if (status === "accepted") return `${posterName} accepted your request`;
    if (status === "referred") return `${posterName} referred you at the company`;
    if (status === "interviewing") return `Interview stage with ${posterName}'s company`;
    if (status === "hired") return `Hired through ${posterName}'s referral`;
    if (status === "rejected") return `${posterName} declined your referral request`;
    if (status === "rejected_after_interview") return `Not selected after interview via ${posterName}`;
    return `Sent to ${posterName}`;
  })();

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background overflow-hidden shadow-md">
      {/* Header */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-4 border-b border-primary/10 bg-primary/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Your referral progress
            </p>
            <h2 className="text-lg sm:text-xl font-bold break-words">{jobTitle}</h2>
            <p className="text-sm text-muted-foreground">{company}</p>
          </div>
          <ReferralStatusBadge status={status} className="shrink-0" />
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Big progress bar */}
        {!isRejected ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>{STATUS_LABELS[status as ReferralStatus] ?? status}</span>
              <span className="text-primary tabular-nums">{percent}% complete</span>
            </div>
            <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">
              {STATUS_LABELS[status as ReferralStatus]}
            </p>
            {isClosed && (
              <p className="text-xs text-muted-foreground">
                This request is closed. You cannot send another referral request for this job opening.
              </p>
            )}
          </div>
        )}

        {/* Step pills */}
        {!isRejected && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none sm:grid sm:grid-cols-5 sm:gap-1 sm:overflow-visible sm:mx-0 sm:px-0">
            {FLOW_STEPS.map((step, idx) => {
              const done = idx < currentIdx;
              const active = idx === currentIdx;
              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center gap-1 text-center min-w-[3.5rem] sm:min-w-0 shrink-0 sm:shrink"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0",
                      done && "bg-primary text-primary-foreground border-primary",
                      active && "bg-primary/15 text-primary border-primary ring-2 ring-primary/20",
                      !done && !active && "bg-muted text-muted-foreground border-muted",
                    )}
                  >
                    {done ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] leading-tight max-w-[4rem] sm:max-w-none truncate sm:whitespace-normal",
                      active ? "font-bold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Info rows */}
        <div className="rounded-lg border bg-muted/30 divide-y text-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <User className="w-4 h-4 text-primary shrink-0" />
            <span>{posterStatusLine}</span>
          </div>
          {requestedAt && (
            <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              Requested {formatDistanceToNow(new Date(requestedAt), { addSuffix: true })}
            </div>
          )}
          {note && (
            <div className="px-4 py-3 text-muted-foreground">
              <span className="text-xs font-semibold uppercase text-foreground/70">Your message</span>
              <p className="mt-1">&ldquo;{note}&rdquo;</p>
            </div>
          )}
          {pointsPaid > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-warning font-semibold">
              <Coins className="w-4 h-4" />−{pointsPaid} pts paid from your account (added to {posterName})
            </div>
          )}
          {requesterRewardHint && (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              {requesterRewardHint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
