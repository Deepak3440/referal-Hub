import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, FileText, Inbox, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReferralChatPanel } from "@/components/messages/referral-chat-panel";
import { ReferralActions } from "@/components/referrals/referral-actions";
import { ReferralProgressBar } from "@/components/referrals/referral-progress-bar";
import { ReferralStatusBadge } from "@/components/referrals/referral-status-badge";
import {
  companyReferralApi,
  COMPANY_REFERRAL_QUERY_KEYS,
  type CompanyReferrerViewStatus,
  type IncomingCompanyReferralRequest,
} from "@/lib/company-referral-api";
import { buildConversationId } from "@/lib/conversation";
import { resolveUploadUrl } from "@/lib/upload-url";
import { avatarBgClass } from "@/lib/avatar-colors";
import { type ReferralStatus } from "@/lib/referral";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TERMINAL: ReferralStatus[] = ["hired", "rejected", "rejected_after_interview"];

function isActiveWorkflow(status: CompanyReferrerViewStatus): status is ReferralStatus {
  return status !== "pending" && status !== "personal_rejected" && status !== "already_referred";
}

function ReferrerStatusBadge({ status }: { status: CompanyReferrerViewStatus }) {
  if (status === "pending") {
    return (
      <Badge className="bg-warning/15 text-warning-foreground border-0 text-[10px] shrink-0">
        Needs response
      </Badge>
    );
  }
  if (status === "already_referred") {
    return (
      <Badge variant="secondary" className="text-[10px] shrink-0 gap-1 font-normal">
        <ShieldCheck className="h-3 w-3" />
        Referred by alumni
      </Badge>
    );
  }
  if (isActiveWorkflow(status)) {
    return <ReferralStatusBadge status={status} className="shrink-0" />;
  }
  return null;
}

function CompanyReferralRequestRow({
  request,
  currentUserId,
  expanded,
  onToggle,
  onUpdateStatus,
  updating,
}: {
  request: IncomingCompanyReferralRequest;
  currentUserId: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (status: ReferralStatus) => void;
  updating: boolean;
}) {
  const name = request.requester?.fullName ?? "Member";
  const conversationId = buildConversationId(currentUserId, request.requesterId);
  const resumeHref = resolveUploadUrl(request.resumeUrl);
  const viewStatus = request.referrerStatus;
  const rewardPoints = request.rewardPoints ?? 100;
  const isPending = viewStatus === "pending";
  const isHandler = isActiveWorkflow(viewStatus);
  const canChat = isPending || isHandler;
  const showActions = isPending || (isHandler && !TERMINAL.includes(viewStatus));

  return (
    <div
      className={cn(
        "border-b border-border/60 last:border-0",
        expanded && "bg-muted/20",
        isPending && !expanded && "bg-warning/5",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-2.5 p-3 sm:p-3.5">
        <button
          type="button"
          className="flex flex-1 items-start gap-2.5 min-w-0 text-left"
          onClick={onToggle}
        >
          <div
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5",
              avatarBgClass(name),
            )}
          >
            {name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-semibold text-sm truncate">{name}</span>
              <span className="text-muted-foreground text-xs truncate hidden sm:inline">
                · {request.roleTitle}
              </span>
              <ReferrerStatusBadge status={viewStatus} />
            </div>
            <p className="text-xs text-muted-foreground sm:hidden">{request.roleTitle}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{request.note}</p>
            <p className="text-[11px] text-muted-foreground/80 mt-1 flex flex-wrap items-center gap-x-2">
              <span>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</span>
              {resumeHref && (
                <span className="inline-flex items-center gap-0.5">
                  <FileText className="h-3 w-3" />
                  Resume
                </span>
              )}
            </p>
            {isHandler && !expanded && (
              <div className="pt-2 max-w-md">
                <ReferralProgressBar
                  status={viewStatus}
                  showLabel={false}
                  showSteps={false}
                  className="space-y-0 [&_[role=progressbar]]:h-1"
                />
              </div>
            )}
            {viewStatus === "already_referred" && (
              <p className="text-[11px] text-muted-foreground mt-1.5 rounded-md bg-muted/50 px-2 py-1 inline-block">
                Another alumni at {request.company} is already helping this student.
              </p>
            )}
          </div>
        </button>

        {showActions && (
          <div className="shrink-0 w-full sm:w-auto pl-11 sm:pl-0" onClick={(e) => e.stopPropagation()}>
            <ReferralActions
              status={isPending ? "pending" : viewStatus}
              rewardPoints={rewardPoints}
              disabled={updating}
              compact
              onUpdate={onUpdateStatus}
            />
          </div>
        )}

        <button
          type="button"
          className="p-1 text-muted-foreground hover:text-foreground self-start sm:ml-0 ml-auto"
          onClick={onToggle}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-4 pt-0 space-y-3 sm:pl-14">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <a
              href={request.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline"
            >
              Job posting
            </a>
            {resumeHref ? (
              <a
                href={resumeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                <FileText className="h-3 w-3" />
                Resume
              </a>
            ) : (
              <span className="text-muted-foreground">No resume</span>
            )}
            <Link
              href={`/profile/${request.requesterId}`}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              View profile
            </Link>
          </div>

          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{request.note}</p>

          {isHandler && (
            <ReferralProgressBar status={viewStatus} colored className="max-w-lg" />
          )}

          {canChat && (
            <ReferralChatPanel
              conversationId={conversationId}
              otherUserName={name}
              jobTitle={request.roleTitle}
              defaultOpen
              compact
              className="shadow-none border-border/70 w-full min-w-0"
            />
          )}

          {viewStatus === "already_referred" && (
            <p className="text-xs text-muted-foreground rounded-lg border bg-muted/30 px-3 py-2">
              No action needed — this student is already being helped by another alumni at your company.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function CompanyReferralsPanel({ currentUserId }: { currentUserId: number }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: COMPANY_REFERRAL_QUERY_KEYS.incoming,
    queryFn: () => companyReferralApi.listIncoming(),
  });

  const items = data?.items ?? [];
  const visibleItems = useMemo(
    () => items.filter((r) => r.referrerStatus !== "personal_rejected"),
    [items],
  );
  const pending = useMemo(
    () => visibleItems.filter((r) => r.referrerStatus === "pending").length,
    [visibleItems],
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ReferralStatus }) =>
      companyReferralApi.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: COMPANY_REFERRAL_QUERY_KEYS.incoming });
      queryClient.invalidateQueries({ queryKey: COMPANY_REFERRAL_QUERY_KEYS.mine });
      const labels: Partial<Record<ReferralStatus, string>> = {
        accepted: "Request accepted",
        rejected: "Request declined",
        referred: "Marked as referred",
        interviewing: "Interview scheduled",
        hired: "Marked as hired",
        rejected_after_interview: "Marked not selected",
      };
      toast({ title: labels[variables.status] ?? "Status updated" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (!isLoading && pending > 0) setOpen(true);
  }, [isLoading, pending]);

  if (!isLoading && visibleItems.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight text-foreground">
            Company requests
            {!isLoading && visibleItems.length > 0 && (
              <span className="text-muted-foreground font-semibold ml-1.5">({visibleItems.length})</span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Same flow as job referrals — accept, refer, interview, hire. First alumni to accept owns the request.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 shrink-0 pt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {pending > 0 && (
            <Badge className="bg-warning hover:bg-warning text-warning-foreground border-0 text-[10px] px-2">
              {pending} pending
            </Badge>
          )}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {!open && pending > 0 && (
        <p className="text-[11px] text-warning px-0.5">
          {pending} student{pending !== 1 ? "s" : ""} waiting for your response — expand above
        </p>
      )}

      {open && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-3">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Inbox className="h-7 w-7 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No active company requests.</p>
            </div>
          ) : (
            <div className={cn(visibleItems.length > 4 && "max-h-[min(560px,70vh)] overflow-y-auto")}>
              {visibleItems.map((request) => (
                <CompanyReferralRequestRow
                  key={request.id}
                  request={request}
                  currentUserId={currentUserId}
                  expanded={expandedId === request.id}
                  onToggle={() => setExpandedId((id) => (id === request.id ? null : request.id))}
                  updating={statusMutation.isPending}
                  onUpdateStatus={(status) => statusMutation.mutate({ id: request.id, status })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
