import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, FileText, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReferralChatPanel } from "@/components/messages/referral-chat-panel";
import {
  companyReferralApi,
  COMPANY_REFERRAL_QUERY_KEYS,
  type IncomingCompanyReferralRequest,
} from "@/lib/company-referral-api";
import { buildConversationId } from "@/lib/conversation";
import { resolveUploadUrl } from "@/lib/upload-url";
import { cn } from "@/lib/utils";

function avatarColor(name: string) {
  const colors = ["bg-blue-600", "bg-violet-600", "bg-emerald-600", "bg-orange-600", "bg-rose-600"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function CompanyReferralRequestRow({
  request,
  currentUserId,
  expanded,
  onToggle,
}: {
  request: IncomingCompanyReferralRequest;
  currentUserId: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const name = request.requester?.fullName ?? "Member";
  const conversationId = buildConversationId(currentUserId, request.requesterId);
  const resumeHref = resolveUploadUrl(request.resumeUrl);
  const isPending = request.status === "pending";

  return (
    <div className={cn("border-b border-border/60 last:border-0", expanded && "bg-muted/20")}>
      <button
        type="button"
        className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5",
            avatarColor(name),
          )}
        >
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate">{name}</span>
            <span className="text-muted-foreground text-xs truncate">· {request.roleTitle}</span>
            {isPending && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Pending" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{request.note}</p>
          <p className="text-[11px] text-muted-foreground/80 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0">
            <span>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</span>
            {resumeHref && (
              <span className="inline-flex items-center gap-0.5">
                <FileText className="h-3 w-3" />
                Resume
              </span>
            )}
          </p>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2.5 ml-[2.625rem]">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <a
              href={request.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Job posting
            </a>
            {resumeHref ? (
              <a
                href={resumeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
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
              onClick={(e) => e.stopPropagation()}
            >
              View profile
            </Link>
          </div>

          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{request.note}</p>

          <ReferralChatPanel
            conversationId={conversationId}
            otherUserName={name}
            jobTitle={request.roleTitle}
            defaultOpen={false}
            compact
            className="shadow-none border-border/70"
          />
        </div>
      )}
    </div>
  );
}

export function CompanyReferralsPanel({ currentUserId }: { currentUserId: number }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: COMPANY_REFERRAL_QUERY_KEYS.incoming,
    queryFn: () => companyReferralApi.listIncoming(),
  });

  const items = data?.items ?? [];
  const pending = useMemo(() => items.filter((r) => r.status === "pending").length, [items]);

  useEffect(() => {
    if (!isLoading && pending > 0) setOpen(true);
  }, [isLoading, pending]);

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight text-foreground">
            Company requests
            {!isLoading && items.length > 0 && (
              <span className="text-muted-foreground font-semibold ml-1.5">({items.length})</span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Incoming referral requests — review resume, pitch & reply
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 shrink-0 pt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {pending > 0 && (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-0 text-[10px] px-2">
              {pending} pending
            </Badge>
          )}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {!open && pending > 0 && (
        <p className="text-[11px] text-amber-800/90 dark:text-amber-200/90 px-0.5">
          {pending} student{pending !== 1 ? "s" : ""} waiting for your response — expand above
        </p>
      )}

      {open && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-3">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Inbox className="h-7 w-7 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No company requests yet.</p>
            </div>
          ) : (
            <div className={cn(items.length > 4 && "max-h-[min(420px,50vh)] overflow-y-auto")}>
              {items.map((request) => (
                <CompanyReferralRequestRow
                  key={request.id}
                  request={request}
                  currentUserId={currentUserId}
                  expanded={expandedId === request.id}
                  onToggle={() => setExpandedId((id) => (id === request.id ? null : request.id))}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
