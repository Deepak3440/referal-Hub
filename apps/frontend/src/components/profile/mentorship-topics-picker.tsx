import { MENTOR_CATEGORIES } from "@/lib/mentorship-constants";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (topics: string[]) => void;
  disabled?: boolean;
};

export function MentorshipTopicsPicker({ value, onChange, disabled }: Props) {
  const toggle = (id: string) => {
    if (disabled) return;
    if (value.includes(id)) {
      onChange(value.filter((t) => t !== id));
      return;
    }
    onChange([...value, id]);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Pick what you help with. Students filter mentors by these topics on the Mentorship page.
      </p>
      <div className="flex flex-wrap gap-2">
        {MENTOR_CATEGORIES.map((cat) => {
          const active = value.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(cat.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5",
                disabled && "opacity-60 cursor-not-allowed",
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function mentorshipTopicLabels(ids?: string[]): string[] {
  if (!ids?.length) return [];
  return ids
    .map((id) => MENTOR_CATEGORIES.find((c) => c.id === id)?.label)
    .filter((label): label is string => Boolean(label));
}
