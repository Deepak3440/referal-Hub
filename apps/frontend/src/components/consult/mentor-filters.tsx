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
    <div className="rounded-xl border bg-card p-3 sm:p-4 space-y-3 shadow-sm">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search mentors by name, skills, college..."
            className="pl-9 h-10 rounded-full bg-muted/40 border-muted-foreground/15"
            value={filters.q ?? ""}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
        <Button
          type="button"
          variant={showAdvanced || hasAdvanced ? "default" : "outline"}
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {(showAdvanced || hasAdvanced) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="College"
              className="pl-9 h-9 text-sm rounded-lg"
              value={filters.college ?? ""}
              onChange={(e) => set({ college: e.target.value })}
            />
          </div>
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Stream"
              className="pl-9 h-9 text-sm rounded-lg"
              value={filters.branch ?? ""}
              onChange={(e) => set({ branch: e.target.value })}
            />
          </div>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="number"
              placeholder="Passout year"
              className="pl-9 h-9 text-sm rounded-lg"
              value={filters.graduationYear ?? ""}
              onChange={(e) => set({ graduationYear: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {resultCount != null ? (
            <>
              <span className="font-medium text-foreground">{resultCount}</span> mentors available
            </>
          ) : (
            "Browse alumni mentors"
          )}
        </span>
        {(filters.q || hasAdvanced) && (
          <button type="button" className="text-primary hover:underline" onClick={clearAll}>
            Clear
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
    <div className="flex p-1 rounded-xl bg-muted/50 border border-border/60 gap-1 max-w-lg">
      <button
        type="button"
        onClick={() => onTabChange("experts")}
        className={cn(
          "flex-1 rounded-lg py-2.5 px-3 text-sm font-medium transition-all",
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
          "flex-1 rounded-lg py-2.5 px-3 text-sm font-medium transition-all relative",
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
