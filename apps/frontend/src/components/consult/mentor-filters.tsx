import { useEffect, useState } from "react";
import {
  Search,
  GraduationCap,
  Building2,
  SlidersHorizontal,
  Briefcase,
  Users,
  CalendarCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableCareerFilter } from "@/components/ui/searchable-career-filter";
import { FilterCombobox } from "@/components/ui/filter-combobox";
import type { MentorFilters } from "@/lib/mentor-utils";
import { countActiveMentorFilters, countPrimaryMentorFilters } from "@/lib/mentor-utils";
import {
  EXPERIENCE_FILTER_OPTIONS,
  MENTOR_PASSOUT_FILTER_OPTIONS,
  PRICE_FILTER_OPTIONS,
  SESSION_LENGTH_OPTIONS,
  SPECIALISATION_FILTER_OPTIONS,
} from "@/lib/mentorship-constants";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SegmentGroup, SegmentTab } from "@/components/layout/segmented-control";

const passoutOptions = MENTOR_PASSOUT_FILTER_OPTIONS.map((y) => ({ value: y, label: y }));
const experienceOptions = EXPERIENCE_FILTER_OPTIONS.filter((o) => o.value).map((o) => ({
  value: o.value,
  label: o.label,
}));
const specialisationOptions = SPECIALISATION_FILTER_OPTIONS.filter((o) => o.value).map((o) => ({
  value: o.value,
  label: o.label,
}));
const sessionLengthOptions = SESSION_LENGTH_OPTIONS.filter((o) => o.value).map((o) => ({
  value: o.value,
  label: o.label,
}));
const priceOptions = PRICE_FILTER_OPTIONS.filter((o) => o.value).map((o) => ({
  value: o.value,
  label: o.label,
}));

type Props = {
  filters: MentorFilters;
  onChange: (filters: MentorFilters) => void;
  resultCount?: number;
};

export function MentorFiltersBar({ filters, onChange, resultCount }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Pick<MentorFilters, "college" | "branch" | "sessionLength" | "price">>({
    college: "",
    branch: "",
    sessionLength: "",
    price: "",
  });

  const advancedCount = countActiveMentorFilters(filters);
  const primaryCount = countPrimaryMentorFilters(filters);

  const set = (patch: Partial<MentorFilters>) => onChange({ ...filters, ...patch });

  const clearPrimary = () =>
    onChange({
      ...filters,
      company: "",
      graduationYear: "",
      experience: "",
    });

  const clearAll = () =>
    onChange({
      q: filters.q,
      category: filters.category,
      company: "",
      branch: "",
      college: "",
      graduationYear: "",
      experience: "",
      sessionLength: "",
      price: "",
    });

  useEffect(() => {
    if (sheetOpen) {
      setDraft({
        college: filters.college ?? "",
        branch: filters.branch ?? "",
        sessionLength: filters.sessionLength ?? "",
        price: filters.price ?? "",
      });
    }
  }, [sheetOpen, filters.college, filters.branch, filters.sessionLength, filters.price]);

  const applyAdvanced = () => {
    onChange({
      ...filters,
      college: draft.college ?? "",
      branch: draft.branch ?? "",
      sessionLength: draft.sessionLength ?? "",
      price: draft.price ?? "",
    });
    setSheetOpen(false);
  };

  const clearAdvancedDraft = () => {
    setDraft({ college: "", branch: "", sessionLength: "", price: "" });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search mentors, roles or skills…"
          className="h-11 rounded-xl border-border bg-background pl-10 shadow-sm"
          value={filters.q ?? ""}
          onChange={(e) => set({ q: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableCareerFilter
          kind="company"
          label="Company"
          icon={Building2}
          value={filters.company ?? ""}
          onChange={(v) => set({ company: v })}
        />

        <FilterCombobox
          label="Passout year"
          icon={GraduationCap}
          value={filters.graduationYear ?? ""}
          onChange={(v) => set({ graduationYear: v })}
          options={passoutOptions}
        />

        <FilterCombobox
          label="Experience"
          icon={Briefcase}
          value={filters.experience ?? ""}
          onChange={(v) => set({ experience: v })}
          options={experienceOptions}
        />

        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-[52px] w-full justify-between rounded-xl border-border bg-background px-3 py-2.5 shadow-sm hover:bg-muted/30"
          onClick={() => setSheetOpen(true)}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            More filters
          </span>
          {advancedCount > 0 && (
            <Badge className="h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
              {advancedCount}
            </Badge>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {resultCount != null ? (
            <>
              <span className="font-semibold text-foreground">{resultCount}</span> mentors found
            </>
          ) : (
            "Browse alumni mentors"
          )}
        </span>
        <div className="flex gap-3">
          {primaryCount > 0 && (
            <button type="button" className="font-medium text-primary hover:underline" onClick={clearPrimary}>
              Clear filters
            </button>
          )}
          {(primaryCount > 0 || advancedCount > 0) && (
            <button type="button" className="font-medium text-muted-foreground hover:underline" onClick={clearAll}>
              Reset all
            </button>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>More filters</SheetTitle>
            <SheetDescription>College, specialisation, session length, and price. Tap Apply when done.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex-1 space-y-5 overflow-y-auto overflow-x-visible pr-1 pb-24">
            <SearchableCareerFilter
              kind="college"
              label="College"
              icon={GraduationCap}
              value={draft.college ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, college: v }))}
            />

            <FilterCombobox
              label="Specialisation"
              value={draft.branch ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, branch: v }))}
              options={specialisationOptions}
            />

            <FilterCombobox
              label="Session length"
              value={draft.sessionLength ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, sessionLength: v }))}
              options={sessionLengthOptions}
            />

            <FilterCombobox
              label="Price"
              value={draft.price ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, price: v }))}
              options={priceOptions}
            />
          </div>

          <div className="mt-4 flex gap-2 border-t pt-4">
            <Button type="button" className="flex-1 rounded-xl" onClick={applyAdvanced}>
              Apply filters
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={clearAdvancedDraft}>
              Clear
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function MentorTabBar({
  tab,
  onTabChange,
  mentorCount,
  sessionCount,
  pendingSessions,
}: {
  tab: "experts" | "sessions";
  onTabChange: (t: "experts" | "sessions") => void;
  mentorCount: number;
  sessionCount: number;
  pendingSessions: number;
}) {
  return (
    <SegmentGroup className="w-full sm:w-auto">
      <SegmentTab
        active={tab === "experts"}
        icon={Users}
        label="Find mentors"
        count={mentorCount}
        onClick={() => onTabChange("experts")}
      />
      <SegmentTab
        active={tab === "sessions"}
        icon={CalendarCheck}
        label="My sessions"
        count={sessionCount}
        badge={pendingSessions}
        onClick={() => onTabChange("sessions")}
      />
    </SegmentGroup>
  );
}
