import { cn } from "@/lib/utils";

export function AuthFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-visible rounded-xl border border-border/70 bg-card/50 p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-4 space-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4 overflow-visible">{children}</div>
    </section>
  );
}
