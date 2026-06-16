import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!title && !description && !children) return null;

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end justify-between gap-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          )}
          {description && (
            <p
              className={cn(
                "text-muted-foreground max-w-2xl",
                title ? "text-sm" : "text-sm sm:text-base",
              )}
            >
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function DashboardCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
