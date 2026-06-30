/** Colleges available at signup — add more here later */
export const COLLEGE_OPTIONS = ["Moradabad Institute of Technology"] as const;

export type CollegeOption = (typeof COLLEGE_OPTIONS)[number];

/** Passout years shown in dropdown */
export const PASSOUT_YEAR_OPTIONS = [2023, 2024, 2025, 2026] as const;

export type PassoutYear = (typeof PASSOUT_YEAR_OPTIONS)[number];

export function currentCalendarYear(): number {
  return new Date().getFullYear();
}

/** Passout before current year → alumni; current year or future → student */
export function deriveMemberType(
  passoutYear: number,
  referenceYear = currentCalendarYear(),
): "student" | "alumni" {
  return passoutYear < referenceYear ? "alumni" : "student";
}

export function memberTypeLabel(type: "student" | "alumni"): string {
  return type === "alumni" ? "Alumni" : "Student";
}

export function primaryCollegeFromEducation(
  education?: { institution?: string | null; batchYear?: number | null }[],
): { collegeName: CollegeOption; passoutYear: PassoutYear } {
  const first = education?.[0];
  const collegeName = COLLEGE_OPTIONS.includes(first?.institution as CollegeOption)
    ? (first!.institution as CollegeOption)
    : COLLEGE_OPTIONS[0];
  const batchYear = first?.batchYear;
  const passoutYear: PassoutYear = PASSOUT_YEAR_OPTIONS.includes(batchYear as PassoutYear)
    ? (batchYear as PassoutYear)
    : PASSOUT_YEAR_OPTIONS[PASSOUT_YEAR_OPTIONS.length - 1];
  return { collegeName, passoutYear };
}

export function educationFromCollegePassout(collegeName: string, passoutYear: number) {
  return [
    {
      level: "UG" as const,
      institution: collegeName,
      batchYear: passoutYear,
    },
  ];
}
