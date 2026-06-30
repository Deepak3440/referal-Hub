import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COLLEGE_OPTIONS,
  PASSOUT_YEAR_OPTIONS,
  deriveMemberType,
  memberTypeLabel,
} from "@/lib/college-options";
import { cn } from "@/lib/utils";

type Props = {
  collegeName: string;
  passoutYear: number | "";
  onCollegeChange: (value: string) => void;
  onPassoutYearChange: (value: number) => void;
  className?: string;
};

export function CollegePassoutFields({
  collegeName,
  passoutYear,
  onCollegeChange,
  onPassoutYearChange,
  className,
}: Props) {
  const memberType =
    typeof passoutYear === "number" ? deriveMemberType(passoutYear) : null;

  return (
    <div className={cn("space-y-4 rounded-xl border bg-card p-4", className)}>
      <div>
        <p className="text-sm font-medium">College details</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your status (Student or Alumni) is set automatically from your passout year.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>College name</Label>
          <Select value={collegeName || undefined} onValueChange={onCollegeChange}>
            <SelectTrigger className="h-11 w-full bg-background shadow-sm">
              <SelectValue placeholder="Select your college" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
            {COLLEGE_OPTIONS.map((college) => (
              <SelectItem key={college} value={college}>
                {college}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>

        <div className="space-y-2">
          <Label>Passout year</Label>
          <Select
            value={passoutYear === "" ? undefined : String(passoutYear)}
            onValueChange={(v) => onPassoutYearChange(Number(v))}
          >
            <SelectTrigger className="h-11 w-full bg-background shadow-sm">
              <SelectValue placeholder="Select passout year" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
            {PASSOUT_YEAR_OPTIONS.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </div>

      {memberType && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Your account type</p>
          <p className="text-sm font-semibold text-primary">{memberTypeLabel(memberType)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {memberType === "alumni"
              ? "You graduated before the current year — alumni features are available."
              : "You are in your final year or upcoming batch — registered as a student."}
          </p>
        </div>
      )}
    </div>
  );
}
