export type JobWorkType = "remote" | "hybrid" | "in_office";

export const JOB_WORK_TYPE_OPTIONS: Array<{ value: JobWorkType; label: string }> = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "in_office", label: "In office" },
];

export function workTypeFromJob(job: { isRemote: boolean; isHybrid: boolean }): JobWorkType {
  if (job.isRemote) return "remote";
  if (job.isHybrid) return "hybrid";
  return "in_office";
}

export function workTypeToFlags(type: JobWorkType): { isRemote: boolean; isHybrid: boolean } {
  switch (type) {
    case "remote":
      return { isRemote: true, isHybrid: false };
    case "hybrid":
      return { isRemote: false, isHybrid: true };
    case "in_office":
      return { isRemote: false, isHybrid: false };
  }
}

export function formatJobWorkType(job: { isRemote: boolean; isHybrid: boolean }): string {
  const labels: Record<JobWorkType, string> = {
    remote: "Remote",
    hybrid: "Hybrid",
    in_office: "In office",
  };
  return labels[workTypeFromJob(job)];
}

export function locationPlaceholderForWorkType(type: JobWorkType): string {
  switch (type) {
    case "remote":
      return "Pan India / Global";
    case "hybrid":
      return "Bangalore, Karnataka";
    case "in_office":
      return "Mumbai, Maharashtra";
  }
}
