import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type RequesterBannerTone = "muted" | "primary" | "success" | "warning" | "destructive";

const TONE_CLASS: Record<RequesterBannerTone, string> = {
  muted: "text-muted-foreground bg-muted/30",
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-foreground bg-warning/15",
  destructive: "text-destructive bg-destructive/10",
};

export function RequesterProgressBanner({
  tone = "muted",
  children,
  className,
}: {
  tone?: RequesterBannerTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-xs rounded-lg px-3 py-2 leading-relaxed", TONE_CLASS[tone], className)}>
      {children}
    </p>
  );
}
