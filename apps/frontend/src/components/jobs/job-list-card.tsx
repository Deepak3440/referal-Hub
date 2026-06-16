import { Job } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, Trophy, Clock, ChevronRight, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { formatJobExperience, formatJobSalary } from "@/lib/job-salary";
import { formatJobWorkType } from "@/lib/job-work-type";
import { ReferralStatusBadge } from "@/components/referrals/referral-status-badge";
import { ReferralRequestActions } from "@/components/referrals/referral-request-actions";
import { useSubmitReferral } from "@/hooks/use-submit-referral";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

interface JobListCardProps {
  job: Job;
}

function JobDetailButton({
  jobId,
  children,
  ...props
}: { jobId: number; children: React.ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Button asChild {...props}>
      <Link href={`/jobs/${jobId}`}>{children}</Link>
    </Button>
  );
}

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

export function JobListCard({ job }: JobListCardProps) {
  const { toast } = useToast();
  const { submit, isPending } = useSubmitReferral(job.id);
  const myReferralStatus = job.myReferralStatus ?? null;
  const experience = formatJobExperience(job.experienceMin);
  const salary = formatJobSalary(job);

  const handleRequest = async (note: string) => {
    try {
      await submit(note);
      toast({
        title: "Request sent",
        description: `Referral request sent to ${job.poster.fullName}.`,
      });
    } catch (err) {
      toast({
        title: getApiErrorMessage(err, "Failed to send request"),
        variant: "destructive",
      });
      throw err;
    }
  };

  return (
    <article
      className={cn(
        "group rounded-xl border border-border bg-card p-4 sm:p-5",
        "hover:border-primary/35 hover:shadow-md hover:shadow-primary/5 transition-all duration-200",
      )}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <div
          className={cn(
            "h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm",
            companyColor(job.company),
          )}
        >
          {job.company.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-base sm:text-lg font-semibold text-foreground hover:text-primary transition-colors line-clamp-2"
                >
                  {job.title}
                </Link>
                {myReferralStatus && <ReferralStatusBadge status={myReferralStatus} />}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                  <Building2 className="h-3.5 w-3.5" />
                  {job.company}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location}
                </span>
              </div>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                {experience && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    {experience}
                  </span>
                )}
                {experience && <span className="text-muted-foreground/40">·</span>}
                <span className={salary === "Not disclosed" ? "text-muted-foreground" : "font-semibold text-foreground"}>
                  {salary}
                </span>
              </p>
            </div>

            <Badge className="bg-primary/10 text-primary border-0 shrink-0 font-semibold">
              <Trophy className="h-3.5 w-3.5 mr-1" />
              {job.rewardPoints} pts
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[11px] font-normal">
              {formatJobWorkType(job)}
            </Badge>
            {job.referralCount > 0 && (
              <Badge variant="outline" className="text-[11px] font-normal">
                {job.referralCount} request{job.referralCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.skills.slice(0, 5).map((skill) => (
                <span
                  key={skill}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 5 && (
                <span className="text-[11px] text-muted-foreground self-center">
                  +{job.skills.length - 5}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Posted by <span className="font-medium text-foreground/70">{job.poster.fullName}</span>
              <span>·</span>
              {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
            </p>

            <div className="flex items-center gap-2 shrink-0">
              <JobDetailButton jobId={job.id} variant="outline" size="sm" className="h-8">
                View job
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </JobDetailButton>
              <ReferralRequestActions
                job={job}
                isPending={isPending}
                onSubmit={handleRequest}
                buttonSize="sm"
                buttonClassName="h-8"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
