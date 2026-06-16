import type { ReferralStats } from "@/lib/referral-stats-api";
import { DashboardCard } from "@/components/layout/page-header";
import { Link } from "wouter";
import { CheckCircle2, TrendingUp, Trophy } from "lucide-react";

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
        <StatBox label="Accepted" value={stats.accepted} />
        <StatBox label="Referred" value={stats.referred} />
        <StatBox label="Hires" value={stats.hires} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatBox label="Rejected" value={stats.rejected} />
        <StatBox label="Interviews" value={stats.interviews} />
        <StatBox label="Accept rate" value={stats.acceptanceRate} suffix="%" />
        <StatBox label="Hire rate" value={stats.hireRate} suffix="%" />
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
}: {
  items: Array<{
    user: { id: number; fullName: string; company?: string | null; currentRole?: string | null };
    stats: { hires: number; interviews: number; acceptanceRate: number; referralsGiven: number };
  }>;
  title?: string;
}) {
  if (!items.length) return null;

  return (
    <DashboardCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((entry, i) => (
          <li key={entry.user.id}>
            <Link
              href={`/profile/${entry.user.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{entry.user.fullName}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {[entry.user.currentRole, entry.user.company].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold">{entry.stats.hires} hires</p>
                <p className="text-[10px] text-muted-foreground">
                  {entry.stats.acceptanceRate}% accept
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
