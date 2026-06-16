import { Job } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Building, Trophy, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { formatJobExperience, formatJobSalary } from "@/lib/job-salary";
import { formatJobWorkType } from "@/lib/job-work-type";
import { ReferralStatusBadge } from "@/components/referrals/referral-status-badge";
import { ReferralRequestActions } from "@/components/referrals/referral-request-actions";
import { useSubmitReferral } from "@/hooks/use-submit-referral";
import {
  canSendReferralRequest,
  getReferralCtaLabel,
  type ReferralStatus,
} from "@/lib/referral";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ComponentProps } from "react";

interface JobCardProps {
  job: Job;
  showActions?: boolean;
  variant?: "default" | "browse" | "mine";
}

/** Button that navigates to job detail — avoids invalid <a><button> nesting */
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

function BrowseJobActions({ job }: { job: Job }) {
  const { toast } = useToast();
  const { submit, isPending } = useSubmitReferral(job.id);
  const myReferralStatus = job.myReferralStatus ?? null;

  const handleRequest = async (note: string) => {
    try {
      await submit(note);
      toast({
        title: "Request sent — Pending",
        description: `Sent to ${job.poster.fullName}. Track it under Track Requests.`,
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
    <div className="flex gap-2 items-end">
      <JobDetailButton jobId={job.id} variant="outline" size="sm">
        Details
      </JobDetailButton>
      {canSendReferralRequest(myReferralStatus) ? (
        <ReferralRequestActions job={job} isPending={isPending} onSubmit={handleRequest} />
      ) : (
        <JobDetailButton jobId={job.id} size="sm">
          {getReferralCtaLabel(myReferralStatus as ReferralStatus)}
        </JobDetailButton>
      )}
    </div>
  );
}

export function JobCard({ job, showActions = true, variant = "default" }: JobCardProps) {
  const isOwnJob = job.isOwnJob ?? false;
  const myReferralStatus = job.myReferralStatus ?? null;
  const experience = formatJobExperience(job.experienceMin);
  const salary = formatJobSalary(job);

  const footerAction = () => {
    if (!showActions) return null;

    if (variant === "mine" || isOwnJob) {
      return (
        <JobDetailButton jobId={job.id} variant="outline" size="sm">
          Manage requests
        </JobDetailButton>
      );
    }

    if (variant === "browse") {
      return <BrowseJobActions job={job} />;
    }

    if (myReferralStatus) {
      return (
        <JobDetailButton jobId={job.id} variant="secondary" size="sm">
          {getReferralCtaLabel(myReferralStatus as ReferralStatus)}
        </JobDetailButton>
      );
    }

    return (
      <JobDetailButton jobId={job.id} size="sm">
        Request Referral
      </JobDetailButton>
    );
  };

  return (
    <Card className="rounded-xl border-border shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/jobs/${job.id}`}
                className="font-semibold text-lg leading-tight line-clamp-2 hover:underline"
              >
                {job.title}
              </Link>
              {isOwnJob && <Badge variant="secondary">You offer referral</Badge>}
              {myReferralStatus && <ReferralStatusBadge status={myReferralStatus} />}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building className="w-4 h-4" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {experience && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Briefcase className="w-3.5 h-3.5" />
                  {experience}
                </span>
              )}
              {experience && <span className="text-muted-foreground/50">·</span>}
              <span className={salary === "Not disclosed" ? "text-muted-foreground" : "font-semibold text-foreground"}>
                {salary}
              </span>
            </p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
            <Trophy className="w-3.5 h-3.5 mr-1" />
            {job.rewardPoints} pts
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{formatJobWorkType(job)}</Badge>
          {job.referralCount > 0 && (
            <Badge variant="outline">{job.referralCount} request{job.referralCount !== 1 ? "s" : ""}</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {job.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="text-xs bg-muted px-2 py-1 rounded-md">{skill}</span>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground truncate">
          {isOwnJob ? "Your opening" : `By ${job.poster.fullName}`}
          <span className="mx-1">·</span>
          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
        </div>
        {footerAction()}
      </CardFooter>
    </Card>
  );
}
