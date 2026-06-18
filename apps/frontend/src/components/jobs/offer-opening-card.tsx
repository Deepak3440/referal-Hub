import type { Job } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  Building2,
  MapPin,
  Trophy,
  Users,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatJobExperience, formatJobSalary } from "@/lib/job-salary";
import { formatJobWorkType } from "@/lib/job-work-type";
import { JobReferralsPanel } from "@/components/jobs/job-referrals-panel";
import { companyColor } from "@/lib/avatar-colors";
import { cn } from "@/lib/utils";

export function OfferOpeningCard({ job }: { job: Job }) {
  const experience = formatJobExperience(job.experienceMin);
  const salary = formatJobSalary(job);
  const hasRequests = job.referralCount > 0;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card overflow-hidden shadow-sm transition-all duration-200",
        "hover:border-primary/30 hover:shadow-md",
        hasRequests && "border-primary/20",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm",
              companyColor(job.company),
            )}
          >
            {job.company.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-base sm:text-lg font-semibold text-foreground hover:text-primary transition-colors line-clamp-2"
                >
                  {job.title}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground/85">
                    <Building2 className="h-3.5 w-3.5" />
                    {job.company}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                </div>
              </div>

              <Badge className="bg-primary/10 text-primary border-0 shrink-0 font-semibold">
                <Trophy className="h-3.5 w-3.5 mr-1" />
                {job.rewardPoints} pts
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary" className="font-normal">
                {formatJobWorkType(job)}
              </Badge>
              {experience && (
                <span className="text-muted-foreground text-xs">{experience}</span>
              )}
              <span className="text-muted-foreground/40">·</span>
              <span
                className={cn(
                  "text-xs font-medium",
                  salary === "Not disclosed" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {salary}
              </span>
            </div>

            {job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {job.skills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
                {job.skills.length > 4 && (
                  <span className="text-[11px] text-muted-foreground self-center">
                    +{job.skills.length - 4}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <strong className="text-foreground font-semibold">{job.referralCount}</strong>
                  request{job.referralCount !== 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                </span>
              </div>
              <Button variant="outline" size="sm" className="h-8 rounded-full" asChild>
                <Link href={`/jobs/${job.id}`}>
                  View opening
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-4 sm:pb-5 bg-muted/20 border-t">
        <JobReferralsPanel
          jobId={job.id}
          jobTitle={job.title}
          jobRewardPoints={job.rewardPoints}
          requestCount={job.referralCount}
          defaultOpen={false}
          embedded
        />
      </div>
    </article>
  );
}
