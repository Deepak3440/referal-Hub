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
import { Video } from "lucide-react";

type ConsultRequestDialogProps = {
  consultantName: string;
  consultantId: number;
  disabled?: boolean;
  onSubmit: (message: string) => Promise<void>;
  trigger?: React.ReactNode;
};

export function ConsultRequestDialog({
  consultantName,
  consultantId,
  disabled,
  onSubmit,
  trigger,
}: ConsultRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      await onSubmit(
        message.trim() || `I'd like a 1:1 consulting session with ${consultantName}.`,
      );
      setOpen(false);
      setMessage("");
    } catch {
      // parent shows toast
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" disabled={disabled || busy}>
            <Video className="w-4 h-4 mr-1" />
            Ask Consulting
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request 1:1 consulting</DialogTitle>
          <DialogDescription>
            Send a request to <strong>{consultantName}</strong>. They can accept and pick a time — you&apos;ll get a Google Meet link.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground rounded-lg border bg-muted/30 px-3 py-2">
            1. You send request → 2. They book calendar → 3. Meet link auto-generated → 4. Join on time
          </p>
          <div className="space-y-2">
            <Label htmlFor="consult-msg">What do you need help with?</Label>
            <Textarea
              id="consult-msg"
              placeholder="Career advice, interview prep, resume review..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              disabled={busy}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
