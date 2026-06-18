import { cn } from "@/lib/utils";

export function SegmentGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-lg border bg-muted/30 p-0.5", className)}>
      {children}
    </div>
  );
}

export function SegmentTab({
  active,
  icon: Icon,
  label,
  count,
  badge,
  onClick,
}: {
  active: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs transition-all",
        active
          ? "bg-primary font-semibold text-primary-foreground shadow-md"
          : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {Icon && (
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary-foreground" : "opacity-70")}
        />
      )}
      <span>{label}</span>
      {count != null && (
        <span
          className={cn(
            "tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
      {!active && badge != null && badge > 0 && (
        <span className="rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-bold text-warning-foreground tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
}

export function SegmentFilterChip({
  active,
  label,
  count,
  highlight,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  highlight?: boolean;
  onClick: () => void;
}) {
  const showAttention = !active && highlight && count > 0;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-current={active ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs transition-all",
        active
          ? "bg-primary font-semibold text-primary-foreground shadow-md"
          : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : showAttention
              ? "bg-warning text-warning-foreground"
              : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
