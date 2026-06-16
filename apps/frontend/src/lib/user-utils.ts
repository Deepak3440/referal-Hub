export function isAlumniMember(user?: { memberType?: string } | null): boolean {
  return user?.memberType === "alumni";
}

export function memberTypeLabel(type?: string): string {
  return type === "alumni" ? "Alumni" : "Student";
}
