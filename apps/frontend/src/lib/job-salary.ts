type SalaryFields = {
  salaryDisclosed?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
};

function isSalaryDisclosed(job: SalaryFields): boolean {
  if (job.salaryDisclosed != null) return job.salaryDisclosed;
  return Boolean((job.salaryMin ?? 0) > 0 || (job.salaryMax ?? 0) > 0);
}

function formatLpa(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export function formatJobSalary(job: SalaryFields): string {
  if (!isSalaryDisclosed(job)) return "Not disclosed";

  const min = job.salaryMin ?? 0;
  const max = job.salaryMax ?? 0;

  if (min > 0 && max > 0) return `${formatLpa(min)} – ${formatLpa(max)} LPA`;
  if (min > 0) return `${formatLpa(min)}+ LPA`;
  if (max > 0) return `Up to ${formatLpa(max)} LPA`;
  return "Not disclosed";
}

export function formatJobExperience(min?: number | null): string | null {
  if (min == null || min <= 0) return null;
  return `${min}+ yrs`;
}
