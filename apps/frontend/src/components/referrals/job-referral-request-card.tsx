import { formatDistanceToNow } from "date-fns";
import { Briefcase, ExternalLink, User } from "lucide-react";
import { Link } from "wouter";
import { useGetMe, type Referral } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { DashboardCard } from "@/components/layout/page-header";
import { ReferralChatPanel } from "@/components/messages/referral-chat-panel";
import { ReferralProgressBar } from "@/components/referrals/referral-progress-bar";
import { ReferralStatusBadge } from "@/components/referrals/referral-status-badge";
import { RequesterProgressBanner } from "@/components/referrals/requester-progress-banner";
import { buildConversationId } from "@/lib/conversation";
import { companyColor } from "@/lib/avatar-colors";
import { STATUS_LABELS, type ReferralStatus } from "@/lib/referral";
import { cn } from "@/lib/utils";

function jobProgressBanner(status: ReferralStatus, referrerName: string) {
  switch (status) {
    case "pending":
      return {
        tone: "warning" as const,
        text: `You sent this request to ${referrerName}. Wait for accept or decline — use chat below to ask questions or share your resume.`,
      };
    case "accepted":
      return {
        tone: "primary" as const,
        text: `${referrerName} accepted your request. Chat below to coordinate — track progress: ${STATUS_LABELS.referred} → Interview → Hired.`,
      };
    case "referred":
      return {
        tone: "primary" as const,
        text: `${referrerName} referred you at the company. Interview may be next — keep in touch via chat.`,
      };
    case "interviewing":
      return {
        tone: "primary" as const,
        text: `Interview in progress with ${referrerName}'s company. Good luck — chat is open for updates.`,
      };
    case "hired":
      return {
        tone: "success" as const,
        text: `Congratulations — you were marked as hired through ${referrerName}'s referral!`,
      };
    case "rejected":
      return {
        tone: "destructive" as const,
        text: `${referrerName} declined this request. Only one request is allowed per job opening.`,
      };
    case "rejected_after_interview":
      return {
        tone: "destructive" as const,
        text: `Not selected after interview via ${referrerName}. This request is closed.`,
      };
    default:
      return null;
  }
}

export function JobReferralRequestCard({
  referral,
  showChat = true,
}: {
  referral: Referral;
  showChat?: boolean;
}) {
  const { data: me } = useGetMe();
  const status = referral.status as ReferralStatus;
  const jobTitle = referral.job?.title ?? "Job opening";
  const company = referral.job?.company ?? "Company";
  const referrerName = referral.referrer?.fullName ?? "Alumni";
  const referrerId = referral.referrerId;
  const conversationId =
    me && referrerId ? buildConversationId(me.id, referrerId) : null;
  const banner = jobProgressBanner(status, referrerName);
  const pointsPaid = referral.totalPointsDeducted ?? 0;

  return (
    <DashboardCard className="p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Job request you sent
            </p>
            <Badge variant="outline" className="text-[10px] h-5 font-normal">
              Specific job
            </Badge>
          </div>

          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0",
                companyColor(company),
              )}
            >
              {company.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 min-w-0">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{jobTitle}</span>
              </p>
              <p className="text-sm text-foreground/90">{company}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                <User className="w-3 h-3 shrink-0" />
                Requested referral from {referrerName}
                <span className="mx-1">·</span>
                {formatDistanceToNow(new Date(referral.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        <ReferralStatusBadge status={status} className="shrink-0 self-start" />
      </div>

      <ReferralProgressBar status={status} colored className="max-w-lg" />

      {banner && <RequesterProgressBanner tone={banner.tone}>{banner.text}</RequesterProgressBanner>}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <Link
          href={`/jobs/${referral.jobId}`}
          className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
        >
          View job details
          <ExternalLink className="h-3 w-3" />
        </Link>
        {pointsPaid > 0 && (
          <span className="text-muted-foreground">−{pointsPaid} pts paid by you</span>
        )}
      </div>

      {referral.note?.trim() && (
        <p className="text-xs text-muted-foreground rounded-lg border bg-muted/20 px-3 py-2 whitespace-pre-wrap">
          {referral.note.trim()}
        </p>
      )}

      {showChat && conversationId && (
        <ReferralChatPanel
          conversationId={conversationId}
          otherUserName={referrerName}
          jobTitle={`${jobTitle} · ${company}`}
          defaultOpen={false}
          compact
          className="shadow-none border-border/70 w-full min-w-0"
        />
      )}
    </DashboardCard>
  );
}
