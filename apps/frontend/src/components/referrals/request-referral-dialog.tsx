import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Coins } from "lucide-react";
import { ReferralFlowSteps } from "./referral-flow-steps";

type PipelineRow = {
  label: string;
  deductPct: number;
  deductPoints: number;
};

type RequestReferralDialogProps = {
  jobTitle: string;
  company: string;
  posterName: string;
  disabled?: boolean;
  isPending?: boolean;
  pointsHint?: string;
  canAfford?: boolean;
  requiredPoints?: number;
  balancePoints?: number;
  rewardPoints?: number;
  pipeline?: PipelineRow[];
  onSubmit: (note: string) => Promise<void>;
  trigger?: React.ReactNode;
};

export function RequestReferralDialog({
  jobTitle,
  company,
  posterName,
  disabled,
  isPending,
  pointsHint,
  canAfford = true,
  requiredPoints,
  balancePoints,
  rewardPoints,
  pipeline = [],
  onSubmit,
  trigger,
}: RequestReferralDialogProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(
        note.trim() || "I am interested in this role and would appreciate a referral.",
      );
      setOpen(false);
      setNote("");
    } catch {
      // stay open — parent shows error toast
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isPending || submitting;
  const blocked = disabled || !canAfford;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button disabled={blocked || busy}>
            <Send className="w-4 h-4 mr-2" />
            {busy ? "Sending..." : !canAfford ? "Not enough pts" : "Request Referral"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send referral request</DialogTitle>
          <DialogDescription>
            This goes to <strong>{posterName}</strong> for <strong>{jobTitle}</strong> at {company}.
            You can only send <strong>one request per job</strong> — if declined, you cannot apply again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Flow after you send
            </p>
            <ReferralFlowSteps status="pending" compact />
          </div>

          {pipeline.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5" />
                Points from {rewardPoints} pt opening ({pipeline.reduce((s, x) => s + x.deductPct, 0)}% total)
              </p>
              <ul className="space-y-1 text-muted-foreground">
                {pipeline.map((s) => (
                  <li key={s.label} className="flex justify-between gap-2">
                    <span>
                      {s.label} <span className="text-muted-foreground/70">({s.deductPct}%)</span>
                    </span>
                    <span className="tabular-nums font-medium text-foreground">−{s.deductPoints} pts</span>
                  </li>
                ))}
              </ul>
              {requiredPoints != null && (
                <p className="pt-1 border-t border-border/60 font-medium text-foreground">
                  Full path: −{requiredPoints} pts · Your balance: {balancePoints ?? 0} pts
                </p>
              )}
            </div>
          )}

          {pointsHint && (
            <p
              className={`text-xs rounded-lg border px-3 py-2 leading-relaxed ${
                canAfford
                  ? "bg-muted/30 border-border text-muted-foreground"
                  : "bg-red-50/60 border-red-200/70 text-red-800 dark:bg-red-950/25 dark:border-red-900/40 dark:text-red-200"
              }`}
            >
              {pointsHint}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="referral-note">Message (optional)</Label>
            <Textarea
              id="referral-note"
              placeholder="Why are you a good fit for this role?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              disabled={busy}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy || blocked}>
            {busy ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
