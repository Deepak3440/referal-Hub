import { Search, GraduationCap, Building2, BookOpen, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MentorFilters } from "@/lib/mentor-utils";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Props = {
  filters: MentorFilters;
  onChange: (filters: MentorFilters) => void;
  resultCount?: number;
};

export function MentorFiltersBar({ filters, onChange, resultCount }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasAdvanced = Boolean(filters.branch || filters.college || filters.graduationYear);

  const set = (patch: Partial<MentorFilters>) => onChange({ ...filters, ...patch });
  const clearAll = () => onChange({ q: "", branch: "", college: "", graduationYear: "" });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search mentors, roles or specialisations..."
          className="pl-11 h-12 rounded-xl bg-card border-border/80 shadow-sm text-base"
          value={filters.q ?? ""}
          onChange={(e) => set({ q: e.target.value })}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1",
            !showAdvanced && "hidden sm:grid",
          )}
        >
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Specialisation"
              className="pl-9 h-10 text-sm rounded-xl bg-card border-border/80"
              value={filters.branch ?? ""}
              onChange={(e) => set({ branch: e.target.value })}
            />
          </div>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Company / College"
              className="pl-9 h-10 text-sm rounded-xl bg-card border-border/80"
              value={filters.college ?? ""}
              onChange={(e) => set({ college: e.target.value })}
            />
          </div>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="number"
              placeholder="Passout year"
              className="pl-9 h-10 text-sm rounded-xl bg-card border-border/80"
              value={filters.graduationYear ?? ""}
              onChange={(e) => set({ graduationYear: e.target.value })}
            />
          </div>
        </div>

        <Button
          type="button"
          variant={showAdvanced || hasAdvanced ? "default" : "outline"}
          className="h-10 rounded-xl shrink-0 gap-2 px-4 sm:hidden"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
        <span>
          {resultCount != null ? (
            <>
              <span className="font-semibold text-foreground">{resultCount}</span> mentors found
            </>
          ) : (
            "Browse alumni mentors"
          )}
        </span>
        {(filters.q || hasAdvanced) && (
          <button type="button" className="text-primary font-medium hover:underline" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

export function MentorTabBar({
  tab,
  onTabChange,
  mentorCount,
  pendingSessions,
}: {
  tab: "experts" | "sessions";
  onTabChange: (t: "experts" | "sessions") => void;
  mentorCount: number;
  pendingSessions: number;
}) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-muted/40 border border-border/60 gap-1">
      <button
        type="button"
        onClick={() => onTabChange("experts")}
        className={cn(
          "rounded-lg py-2 px-4 text-sm font-medium transition-all",
          tab === "experts"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Find mentors
        {mentorCount > 0 && (
          <span className="ml-1.5 text-[10px] text-muted-foreground">({mentorCount})</span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onTabChange("sessions")}
        className={cn(
          "rounded-lg py-2 px-4 text-sm font-medium transition-all relative",
          tab === "sessions"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        My sessions
        {pendingSessions > 0 && (
          <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
            {pendingSessions}
          </span>
        )}
      </button>
    </div>
  );
}
