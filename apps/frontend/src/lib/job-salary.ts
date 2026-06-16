type SalaryFields = {
  salaryDisclosed?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
};

function isSalaryDisclosed(job: SalaryFields): boolean {
  if (job.salaryDisclosed != null) return job.salaryDisclosed;
  return Boolean((job.salaryMin ?? 0) > 0 || (job.salaryMax ?? 0) > 0);
}

function formatAmount(n: number): string {
  return `$${n.toLocaleString()}`;
}

export function formatJobSalary(job: SalaryFields): string {
  if (!isSalaryDisclosed(job)) return "Not disclosed";

  const min = job.salaryMin ?? 0;
  const max = job.salaryMax ?? 0;

  if (min > 0 && max > 0) return `${formatAmount(min)} – ${formatAmount(max)}`;
  if (min > 0) return `${formatAmount(min)}+`;
  if (max > 0) return `Up to ${formatAmount(max)}`;
  return "Not disclosed";
}

export function formatJobExperience(min?: number | null): string | null {
  if (min == null || min <= 0) return null;
  return `${min}+ yrs`;
}
