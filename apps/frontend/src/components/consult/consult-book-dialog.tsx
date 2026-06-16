import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, ExternalLink, Video } from "lucide-react";
import { isValidGoogleMeetLink } from "@/lib/meet-link";

type ConsultBookDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requesterName: string;
  autoMeetEnabled?: boolean;
  onBook: (scheduledAt: string, durationMinutes: number, meetingLink?: string) => Promise<void>;
  onReject: () => Promise<void>;
};

export function ConsultBookDialog({
  open,
  onOpenChange,
  requesterName,
  autoMeetEnabled = false,
  onBook,
  onReject,
}: ConsultBookDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(30);
  const [meetLink, setMeetLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setMeetLink("");
      setLinkError("");
    }
  }, [open]);

  const meetRequired = !autoMeetEnabled;

  const handleBook = async () => {
    if (!date || !time) return;

    const trimmedLink = meetLink.trim();
    if (meetRequired && !trimmedLink) {
      setLinkError("Paste a real Google Meet link from meet.google.com/new");
      return;
    }
    if (trimmedLink && !isValidGoogleMeetLink(trimmedLink)) {
      setLinkError("Invalid format. Example: https://meet.google.com/abc-defg-hij");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    setBusy(true);
    setLinkError("");
    try {
      await onBook(scheduledAt, duration, trimmedLink || undefined);
      onOpenChange(false);
    } catch {
      // parent toast
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      await onReject();
      onOpenChange(false);
    } catch {
      // parent toast
    } finally {
      setBusy(false);
    }
  };

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Book 1:1 session
          </DialogTitle>
          <DialogDescription>
            <strong>{requesterName}</strong> asked for consulting. Pick date & time
            {autoMeetEnabled ? " — Meet link auto-created if you leave the field empty." : " and paste a real Google Meet link."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={busy} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={15}
              max={120}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={busy}
            />
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-primary" />
                Google Meet link {meetRequired ? "(required)" : "(optional)"}
              </Label>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs shrink-0">
                <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer">
                  Create Meet <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              1. Click <strong>Create Meet</strong> → Google opens a real room<br />
              2. Copy the link (e.g. meet.google.com/abc-defg-hij)<br />
              3. Paste below — random links do not work
            </p>
            <Input
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              value={meetLink}
              onChange={(e) => {
                setMeetLink(e.target.value);
                setLinkError("");
              }}
              disabled={busy}
            />
            {linkError && <p className="text-xs text-destructive">{linkError}</p>}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleReject} disabled={busy} className="w-full sm:w-auto">
            Decline
          </Button>
          <Button onClick={handleBook} disabled={busy || !date} className="w-full sm:w-auto">
            {busy ? "Booking..." : "Confirm Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
