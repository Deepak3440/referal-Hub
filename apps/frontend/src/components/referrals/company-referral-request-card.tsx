import { formatDistanceToNow } from "date-fns";
import { Building2, ExternalLink, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardCard } from "@/components/layout/page-header";
import type { CompanyReferralRequestResult } from "@/lib/company-referral-api";
import { cn } from "@/lib/utils";

function companyColor(name: string) {
  const colors = [
    "bg-blue-600",
    "bg-violet-600",
    "bg-emerald-600",
    "bg-orange-600",
    "bg-rose-600",
    "bg-cyan-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function CompanyReferralRequestCard({ request }: { request: CompanyReferralRequestResult }) {
  const referrerCount = request.referrerCount ?? request.referrerIds?.length ?? 0;

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
                <Users className="h-3 w-3 shrink-0" />
                Sent to {referrerCount} alumni referrer{referrerCount !== 1 ? "s" : ""}
                <span className="mx-1">·</span>
                {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        <Badge
          className={cn(
            "self-start shrink-0 capitalize",
            request.status === "pending"
              ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-0"
              : "bg-muted text-muted-foreground border-0",
          )}
        >
          {request.status}
        </Badge>
      </div>

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

      <p className="text-xs text-muted-foreground rounded-lg border bg-muted/20 px-3 py-2 line-clamp-2">
        {request.note}
      </p>
    </DashboardCard>
  );
}
