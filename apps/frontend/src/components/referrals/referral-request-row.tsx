import { Link } from "wouter";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReferralSummary } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ReferralStatusBadge } from "@/components/referrals/referral-status-badge";
import { ReferralActions } from "@/components/referrals/referral-actions";
import { ReferralProgressBar } from "@/components/referrals/referral-progress-bar";
import { ReferralChatPanel } from "@/components/messages/referral-chat-panel";
import {
  formatStageTransferPoster,
  rewardStageForPosterAction,
} from "@/lib/referral-points";
import { type ReferralStatus } from "@/lib/referral";
import { buildConversationId } from "@/lib/conversation";
import { avatarBgClass } from "@/lib/avatar-colors";
import { cn } from "@/lib/utils";

function rewardHint(status: string, rewardPoints: number): string | null {
  const stage = rewardStageForPosterAction(status);
  if (!stage || rewardPoints <= 0) return null;
  const label =
    status === "pending" ? "Accept" : status === "accepted" ? "Mark Referred" : "Mark Hired";
  return `${label} = ${formatStageTransferPoster(rewardPoints, stage)}`;
}

const TERMINAL = new Set(["hired", "rejected", "rejected_after_interview"]);

type ReferralRequestRowProps = {
  referral: ReferralSummary;
  jobTitle?: string;
  jobRewardPoints?: number;
  meId: number;
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onUpdate: (status: ReferralStatus) => void;
};

export function ReferralRequestRow({
  referral,
  jobTitle,
  jobRewardPoints = 0,
  meId,
  expanded,
  onToggle,
  disabled,
  onUpdate,
}: ReferralRequestRowProps) {
  const name = referral.requester?.fullName ?? "Unknown";
  const initial = name.charAt(0).toUpperCase();
  const hint = rewardHint(referral.status, jobRewardPoints);
  const isPending = referral.status === "pending";
  const showQuickActions = isPending && !expanded;

  return (
    <div
      className={cn(
        "transition-colors",
        expanded ? "bg-primary/[0.03]" : "hover:bg-muted/40",
        isPending && !expanded && "bg-warning/10",
      )}
    >
      <div className="flex items-start gap-3 p-3 sm:p-3.5">
        <div
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0",
            avatarBgClass(name),
          )}
        >
          {initial}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/profile/${referral.requesterId}`}
              className="font-semibold text-sm text-primary hover:underline truncate max-w-[140px] sm:max-w-none"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>
            <ReferralStatusBadge status={referral.status} />
          </div>

          {referral.note ? (
            <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2">
              &ldquo;{referral.note}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/70 italic">No message attached</p>
          )}

      {!expanded && !TERMINAL.has(referral.status) && (
            <div className="pt-1 max-w-full sm:max-w-xs">
              <ReferralProgressBar
                status={referral.status}
                showLabel={false}
                showSteps={false}
                className="space-y-0 [&_[role=progressbar]]:h-1"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {showQuickActions && (
            <div className="hidden sm:flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-full px-2.5"
                disabled={disabled}
                onClick={() => onUpdate("rejected")}
              >
                Reject
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs rounded-full px-2.5"
                disabled={disabled}
                onClick={() => onUpdate("accepted")}
              >
                Accept
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full shrink-0"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse request" : "Expand request"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 sm:px-3.5 pb-3.5 space-y-3 border-t border-border/50 bg-background/50">
          {hint && (
            <p className="text-[11px] text-muted-foreground pt-2.5 pl-12 sm:pl-0">{hint}</p>
          )}

          {!TERMINAL.has(referral.status) && (
            <div className="pl-12 sm:pl-0 space-y-2">
              <ReferralActions
                status={referral.status}
                rewardPoints={jobRewardPoints}
                disabled={disabled}
                onUpdate={onUpdate}
                compact
              />
              <ReferralProgressBar
                status={referral.status}
                showLabel
                showSteps={false}
                className="max-w-md [&_[role=progressbar]]:h-1.5"
              />
            </div>
          )}

          <div className="pl-12 sm:pl-0">
            <ReferralChatPanel
              conversationId={buildConversationId(meId, referral.requesterId)}
              otherUserName={name}
              jobTitle={jobTitle}
              defaultOpen={false}
              compact
              className="shadow-none"
            />
          </div>
        </div>
      )}

      {!expanded && isPending && (
        <div className="flex gap-2 px-3 pb-3 sm:hidden pl-[3.75rem]">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs rounded-full"
            disabled={disabled}
            onClick={() => onUpdate("rejected")}
          >
            Reject
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 text-xs rounded-full"
            disabled={disabled}
            onClick={() => onUpdate("accepted")}
          >
            Accept
          </Button>
        </div>
      )}
    </div>
  );
}

export function ReferralFilterTabs({
  active,
  onChange,
  counts,
}: {
  active: ReferralFilter;
  onChange: (tab: ReferralFilter) => void;
  counts: Record<ReferralFilter, number>;
}) {
  const tabs: { key: ReferralFilter; label: string; highlight?: boolean }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending", highlight: counts.pending > 0 },
    { key: "active", label: "Active" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            active === tab.key
              ? "border-primary bg-primary text-primary-foreground"
              : tab.highlight
                ? "border-warning/50 bg-warning/10 text-foreground hover:bg-warning/15"
                : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {tab.label}
          {counts[tab.key] > 0 && (
            <span
              className={cn(
                "tabular-nums rounded-full px-1.5 py-0 text-[10px] font-semibold min-w-[1.25rem] text-center",
                active === tab.key ? "bg-primary-foreground/20" : "bg-muted",
              )}
            >
              {counts[tab.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export type ReferralFilter = "all" | "pending" | "active" | "closed";

export function filterReferrals(referrals: ReferralSummary[], filter: ReferralFilter): ReferralSummary[] {
  const filtered = referrals.filter((r) => {
    if (filter === "all") return true;
    if (filter === "pending") return r.status === "pending";
    if (filter === "active") return ["accepted", "referred", "interviewing"].includes(r.status);
    return ["hired", "rejected", "rejected_after_interview"].includes(r.status);
  });

  const priority: Record<string, number> = {
    pending: 0,
    accepted: 1,
    referred: 2,
    interviewing: 3,
    hired: 4,
    rejected: 5,
    rejected_after_interview: 6,
  };

  return [...filtered].sort(
    (a, b) => (priority[a.status] ?? 99) - (priority[b.status] ?? 99),
  );
}

export function referralFilterCounts(referrals: ReferralSummary[]): Record<ReferralFilter, number> {
  return {
    all: referrals.length,
    pending: referrals.filter((r) => r.status === "pending").length,
    active: referrals.filter((r) => ["accepted", "referred", "interviewing"].includes(r.status)).length,
    closed: referrals.filter((r) =>
      ["hired", "rejected", "rejected_after_interview"].includes(r.status),
    ).length,
  };
}
