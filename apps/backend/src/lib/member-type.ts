export const ALLOWED_COLLEGES = ["Moradabad Institute of Technology"] as const;

export const ALLOWED_PASSOUT_YEARS = [2023, 2024, 2025, 2026] as const;

export function currentCalendarYear(): number {
  return new Date().getFullYear();
}

export function deriveMemberType(
  passoutYear: number,
  referenceYear = currentCalendarYear(),
): "student" | "alumni" {
  return passoutYear < referenceYear ? "alumni" : "student";
}

export function isAllowedCollege(name: string): boolean {
  return (ALLOWED_COLLEGES as readonly string[]).includes(name.trim());
}

export function isAllowedPassoutYear(year: number): boolean {
  return (ALLOWED_PASSOUT_YEARS as readonly number[]).includes(year);
}

export function buildPrimaryEducation(collegeName: string, passoutYear: number) {
  return [{ level: "UG" as const, institution: collegeName.trim(), batchYear: passoutYear }];
}
