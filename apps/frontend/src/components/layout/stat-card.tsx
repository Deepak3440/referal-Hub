import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
  loading,
  sublabel,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  loading?: boolean;
  sublabel?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 flex items-center gap-3 transition-colors",
        highlight && "border-primary/25 bg-primary/5",
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          highlight ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={cn("text-xl font-bold tabular-nums", highlight && "text-primary")}>
          {loading ? "–" : value}
        </p>
        {sublabel && <p className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
