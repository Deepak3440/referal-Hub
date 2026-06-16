import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MapPin, Building, Trophy } from "lucide-react";
import type { Job } from "@workspace/api-client-react";
import { formatJobExperience, formatJobSalary } from "@/lib/job-salary";
import { formatJobWorkType } from "@/lib/job-work-type";

export function JobDetailsCard({ job, compact = false }: { job: Job; compact?: boolean }) {
  const experience = formatJobExperience(job.experienceMin);
  const salary = formatJobSalary(job);

  return (
    <div className="bg-card border rounded-xl p-4 sm:p-5 space-y-5 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Job details
        </p>
        <h1 className={compact ? "text-lg sm:text-xl font-bold" : "text-xl sm:text-2xl font-bold break-words"}>{job.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 font-medium text-foreground">
            <Building className="w-4 h-4" />{job.company}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />{job.location}
          </span>
          <Badge variant="secondary" className="bg-warning/10 text-warning">
            <Trophy className="w-3 h-3 mr-1" />{job.rewardPoints} pts reward
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Work type</div>
          <div className="font-medium">{formatJobWorkType(job)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Experience</div>
          <div className="font-medium">{experience ?? "Not specified"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Salary</div>
          <div className={`font-medium ${salary === "Not disclosed" ? "text-muted-foreground" : "text-foreground"}`}>
            {salary}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total requests</div>
          <div className="font-medium">{job.referralCount}</div>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">About this role</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
          {job.description.split("\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Skills needed</h2>
        <div className="flex flex-wrap gap-1.5">
          {job.skills.map((skill) => (
            <Badge key={skill} variant="secondary">{skill}</Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm">
        <span className="min-w-0 break-words">
          <span className="text-muted-foreground">Posted by </span>
          <strong>{job.poster.fullName}</strong>
        </span>
        <Button asChild variant="outline" size="sm" className="self-start sm:self-auto shrink-0">
          <Link href={`/profile/${job.posterId}`}>View profile</Link>
        </Button>
      </div>
    </div>
  );
}
