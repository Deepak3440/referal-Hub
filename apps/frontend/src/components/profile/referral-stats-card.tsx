import type { ReferralStats } from "@/lib/referral-stats-api";
import { DashboardCard } from "@/components/layout/page-header";
import { Link } from "wouter";
import { CheckCircle2, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

function StatBox({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <p className="text-lg font-bold tabular-nums">
        {value}
        {suffix}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export function ReferralStatsCard({ stats }: { stats: ReferralStats }) {
  if (stats.memberType !== "alumni") {
    return null;
  }

  return (
    <DashboardCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Referral success stats</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatBox label="Requests received" value={stats.referralsGiven} />
        <StatBox label="Pending" value={stats.pending} />
        <StatBox label="Completed (hired)" value={stats.completed} />
        <StatBox label="Hire rate" value={stats.hireRate} suffix="%" />
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        {stats.jobRequestsReceived} job · {stats.companyRequestsReceived} company — all time on
        your openings & company profile
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatBox label="Accepted" value={stats.accepted} />
        <StatBox label="Referred" value={stats.referred} />
        <StatBox label="Interviews" value={stats.interviews} />
        <StatBox label="Hires" value={stats.hires} />
      </div>

      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Helps students find alumni who actively give referrals
      </p>
    </DashboardCard>
  );
}

export function LeaderboardCard({
  items,
  title = "Top alumni referrers",
  embedded = false,
}: {
  items: Array<{
    user: { id: number; fullName: string; company?: string | null; currentRole?: string | null };
    stats: { hires: number; interviews: number; acceptanceRate: number; referralsGiven: number };
  }>;
  title?: string;
  embedded?: boolean;
}) {
  if (!items.length) return null;

  const content = (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-primary shrink-0" />
        <h3 className="font-semibold text-sm leading-tight">{title}</h3>
      </div>
      <ul className={cn(embedded ? "space-y-4" : "space-y-2")}>
        {items.map((entry, i) => {
          const subtitle = [entry.user.currentRole, entry.user.company].filter(Boolean).join(" @ ");
          const initial = entry.user.fullName.trim().charAt(0).toUpperCase() || "?";

          return (
            <li key={entry.user.id}>
              <Link
                href={`/profile/${entry.user.id}`}
                className={cn(
                  "group block rounded-lg transition-colors",
                  embedded ? "hover:bg-muted/40 -mx-1 px-1 py-1" : "rounded-lg px-2 py-2 hover:bg-muted/50",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initial}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">#{i + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors break-words">
                      {entry.user.fullName}
                    </p>
                    {subtitle && (
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground break-words">
                        {subtitle}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                        {entry.stats.hires} hires
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {entry.stats.acceptanceRate}% accept
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );

  if (embedded) {
    return <section className="min-w-0">{content}</section>;
  }

  return <DashboardCard className="p-4">{content}</DashboardCard>;
}
