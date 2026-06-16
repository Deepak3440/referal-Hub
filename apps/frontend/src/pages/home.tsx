import { useState, useEffect } from "react";
import { useListJobs, getListJobsQueryKey, useGetDashboardStats, useGetMe } from "@workspace/api-client-react";
import { useSearchParams, Link } from "wouter";
import { JobListCard } from "@/components/jobs/job-list-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Briefcase,
  Sparkles,
  Trophy,
  Users,
  Send,
  ArrowRight,
  Newspaper,
  Video,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { memberTypeLabel, isAlumniMember } from "@/lib/user-utils";
import { BRAND } from "@/lib/brand";

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">
            {loading ? "–" : value}
          </p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const [searchTitle, setSearchTitle] = useState(q);
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCompany, setSearchCompany] = useState("");

  const { data: me } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();

  useEffect(() => {
    if (q) setSearchTitle(q);
  }, [q]);

  const { data: jobs, isLoading } = useListJobs(
    {
      title: searchTitle || undefined,
      location: searchLocation || undefined,
      company: searchCompany || undefined,
      scope: "community",
    },
    {
      query: {
        queryKey: getListJobsQueryKey({
          title: searchTitle || undefined,
          location: searchLocation || undefined,
          company: searchCompany || undefined,
          scope: "community",
        }),
      },
    },
  );

  const firstName = me?.fullName?.split(" ")[0] ?? "there";
  const isAlumni = isAlumniMember(me);

  return (
    <div className="space-y-6">
      {/* Welcome hero — LinkedIn style */}
      <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-card to-card overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <Badge className="bg-primary/15 text-primary border-0 hover:bg-primary/15 font-medium">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {BRAND.tagline}
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Hi {firstName}, find your next role
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Browse openings posted by alumni & professionals. Request a referral in one click and track every step.
              </p>
              {me && (
                <Badge variant="outline" className="capitalize font-normal">
                  {memberTypeLabel(me.memberType)} member
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 lg:shrink-0">
              <Button size="sm" className="rounded-full shadow-sm" asChild>
                <Link href="/referrals">
                  Track requests
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" asChild>
                <Link href="/feed">
                  <Newspaper className="h-4 w-4 mr-1.5" />
                  Feed
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" asChild>
                <Link href="/consult">
                  <Video className="h-4 w-4 mr-1.5" />
                  Mentors
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Your points"
          value={me?.totalPoints ?? stats?.totalPointsEarned ?? 0}
          icon={Trophy}
        />
        {isAlumni ? (
          <>
            <StatCard
              label="Referrals given"
              value={stats?.referralsGiven ?? 0}
              icon={Users}
              loading={statsLoading}
            />
            <StatCard
              label="Successful hires"
              value={stats?.successfulHires ?? 0}
              icon={Sparkles}
              loading={statsLoading}
            />
            <StatCard
              label="Jobs posted"
              value={stats?.totalJobsPosted ?? 0}
              icon={Briefcase}
              loading={statsLoading}
            />
          </>
        ) : (
          <>
            <StatCard
              label="Requests sent"
              value={stats?.referralsReceived ?? 0}
              icon={Send}
              loading={statsLoading}
            />
            <StatCard
              label="Active referrals"
              value={stats?.activeReferrals ?? 0}
              icon={Users}
              loading={statsLoading}
            />
          </>
        )}
      </section>

      {/* Naukri-style search */}
      <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <h3 className="font-semibold text-sm sm:text-base">Search jobs</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Filter by role, location, or company
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Job title, skills..."
                className="pl-9 h-11 bg-background border-muted-foreground/15 rounded-lg"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Location"
                className="pl-9 h-11 bg-background border-muted-foreground/15 rounded-lg"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />
            </div>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Company"
                className="pl-9 h-11 bg-background border-muted-foreground/15 rounded-lg"
                value={searchCompany}
                onChange={(e) => setSearchCompany(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Job results — Naukri list style */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base">
              {isLoading ? "Loading jobs..." : `${jobs?.length ?? 0} jobs found`}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Referral-backed openings from the community
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[160px] rounded-xl" />
            ))}
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobListCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card text-center py-16 px-6">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <Briefcase className="h-7 w-7 text-primary/60" />
            </div>
            <h3 className="font-semibold text-lg">No jobs match your search</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Try different keywords or check back later for new openings.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
