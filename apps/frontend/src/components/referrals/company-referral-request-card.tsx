import { formatDistanceToNow } from "date-fns";
import { Building2, ExternalLink, MessageSquare, Users } from "lucide-react";
import { Link } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { DashboardCard } from "@/components/layout/page-header";
import { ReferralChatPanel } from "@/components/messages/referral-chat-panel";
import { ReferralProgressBar } from "@/components/referrals/referral-progress-bar";
import { ReferralStatusBadge } from "@/components/referrals/referral-status-badge";
import { RequesterProgressBanner } from "@/components/referrals/requester-progress-banner";
import type { CompanyReferralRequestResult } from "@/lib/company-referral-api";
import { buildConversationId } from "@/lib/conversation";
import { companyColor } from "@/lib/avatar-colors";
import { STATUS_LABELS, type ReferralStatus } from "@/lib/referral";
import { cn } from "@/lib/utils";

function displayStatus(request: CompanyReferralRequestResult): ReferralStatus {
  if (request.workflowStatus) return request.workflowStatus;
  if (request.acceptedByReferrerId) return "accepted";
  if (request.status === "declined" || request.status === "closed") return "rejected";
  return (request.status as ReferralStatus) ?? "pending";
}

function companyProgressBanner(
  status: ReferralStatus,
  company: string,
  handlerName: string | null,
  referrerCount: number,
  isWaiting: boolean,
) {
  if (isWaiting) {
    return {
      tone: "warning" as const,
      text: `Waiting for an alumni at ${company} to accept. Your request was sent to ${referrerCount} alumni — open Messages to chat while you wait.`,
    };
  }
  switch (status) {
    case "accepted":
      return {
        tone: "primary" as const,
        text: handlerName
          ? `${handlerName} accepted your request. Chat below to coordinate — track progress: ${STATUS_LABELS.referred} → Interview → Hired.`
          : `An alumni accepted your request. Track progress below — ${STATUS_LABELS.referred} → Interview → Hired.`,
      };
    case "referred":
      return {
        tone: "primary" as const,
        text: handlerName
          ? `${handlerName} referred you at ${company}. Interview may be next — keep in touch via chat.`
          : `You were referred at ${company}. Interview may be next.`,
      };
    case "interviewing":
      return {
        tone: "primary" as const,
        text: `Interview in progress at ${company}. Good luck — chat is open for updates.`,
      };
    case "hired":
      return {
        tone: "success" as const,
        text: `Congratulations — you were marked as hired through this company referral!`,
      };
    case "rejected":
      return {
        tone: "destructive" as const,
        text: `Alumni at ${company} were not able to take this request. You can try another company.`,
      };
    case "rejected_after_interview":
      return {
        tone: "destructive" as const,
        text: `Not selected after interview at ${company}. This request is closed.`,
      };
    default:
      return null;
  }
}

export function CompanyReferralRequestCard({
  request,
  showChat = true,
}: {
  request: CompanyReferralRequestResult;
  showChat?: boolean;
}) {
  const { data: me } = useGetMe();
  const referrerCount = request.referrerCount ?? request.referrerIds?.length ?? 0;
  const status = displayStatus(request);
  const isWaiting = status === "pending" && !request.acceptedByReferrerId;
  const handler = request.handlerReferrer;
  const handlerName = handler?.fullName ?? null;
  const conversationId =
    me && handler ? buildConversationId(me.id, handler.id) : null;
  const banner = companyProgressBanner(status, request.company, handlerName, referrerCount, isWaiting);
  const progressStatus: ReferralStatus = isWaiting ? "pending" : status;

  return (
    <DashboardCard className="p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Company request you sent
            </p>
            <Badge variant="outline" className="text-[10px] h-5 font-normal">
              Company-wide
            </Badge>
          </div>

          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0",
                companyColor(request.company),
              )}
            >
              {request.company.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 min-w-0">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{request.company}</span>
              </p>
              <p className="text-sm text-foreground/90">{request.roleTitle}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                <Users className="w-3 h-3 shrink-0" />
                Sent to {referrerCount} alumni referrer{referrerCount !== 1 ? "s" : ""}
                <span className="mx-1">·</span>
                {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        <ReferralStatusBadge status={progressStatus} className="shrink-0 self-start" />
      </div>

      <ReferralProgressBar status={progressStatus} colored className="max-w-lg" />

      {banner && <RequesterProgressBanner tone={banner.tone}>{banner.text}</RequesterProgressBanner>}

      <a
        href={request.jobUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        View job posting
        <ExternalLink className="h-3 w-3" />
      </a>

      {request.note?.trim() && (
        <p className="text-xs text-muted-foreground rounded-lg border bg-muted/20 px-3 py-2 whitespace-pre-wrap">
          {request.note.trim()}
        </p>
      )}

      {isWaiting && (
        <div className="rounded-xl border bg-muted/20 px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Chat with alumni who reply while you wait for someone to accept.
            </p>
          </div>
          <Link
            href="/messages"
            className="text-xs font-medium text-primary hover:underline shrink-0"
          >
            Open Messages
          </Link>
        </div>
      )}

      {conversationId && handler && showChat && (
        <ReferralChatPanel
          conversationId={conversationId}
          otherUserName={handler.fullName}
          jobTitle={`${request.roleTitle} · ${request.company}`}
          defaultOpen={false}
          compact
          className="shadow-none border-border/70 w-full min-w-0"
        />
      )}
    </DashboardCard>
  );
}
