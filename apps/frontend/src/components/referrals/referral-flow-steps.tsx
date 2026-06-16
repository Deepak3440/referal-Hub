import { Check } from "lucide-react";
import { FLOW_STEPS, getFlowStepIndex, type ReferralStatus } from "@/lib/referral";
import { cn } from "@/lib/utils";

export function ReferralFlowSteps({ status, compact = false }: { status: string; compact?: boolean }) {
  const isRejected = status === "rejected" || status === "rejected_after_interview";
  const currentIndex = getFlowStepIndex(status as ReferralStatus);

  if (isRejected) {
    return (
      <p className="text-xs text-destructive font-medium">
        Referral {status === "rejected" ? "rejected" : "not selected after interview"}
      </p>
    );
  }

  return (
    <div className={cn("flex items-center w-full", compact ? "gap-0.5" : "gap-1")}>
      {FLOW_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={cn(
                  "rounded-full flex items-center justify-center border shrink-0",
                  compact ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-[10px]",
                  done && "bg-primary text-primary-foreground border-primary",
                  active && "bg-primary/15 text-primary border-primary ring-2 ring-primary/20",
                  !done && !active && "bg-muted text-muted-foreground border-muted-foreground/20",
                )}
              >
                {done ? <Check className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} /> : index + 1}
              </div>
              <span
                className={cn(
                  "mt-1 text-center truncate w-full",
                  compact ? "text-[9px]" : "text-[10px]",
                  active ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < FLOW_STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 mx-0.5 mb-4",
                  index < currentIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
