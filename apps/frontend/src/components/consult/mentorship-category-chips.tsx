import { MENTOR_CATEGORIES } from "@/lib/mentorship-constants";
import { cn } from "@/lib/utils";

const chipBase =
  "shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200";

const chipActive = "border-primary bg-primary text-primary-foreground shadow-sm";
const chipInactive =
  "border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/40 hover:text-foreground";

type Props = {
  value: string;
  onChange: (categoryId: string) => void;
};

export function MentorshipCategoryChips({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
      <button
        type="button"
        onClick={() => onChange("")}
        className={cn(chipBase, !value ? chipActive : chipInactive)}
      >
        All mentors
      </button>
      {MENTOR_CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onChange(value === cat.id ? "" : cat.id)}
          className={cn(chipBase, value === cat.id ? chipActive : chipInactive)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
