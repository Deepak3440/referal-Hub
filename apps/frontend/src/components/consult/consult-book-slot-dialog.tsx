import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Loader2, Trophy, Video } from "lucide-react";
import { consultApi, CONSULT_QUERY_KEYS, type MentorSlot } from "@/lib/consult-api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const ACTIVE_WITH_MENTOR = ["pending_payment", "scheduled", "waiting_for_participants", "started"];

type Props = {
  consultantId: number;
  consultantName: string;
  /** Session fee in platform points (0 = free). */
  priceInr: number;
  durationMinutes: number;
  disabled?: boolean;
  onBooked?: () => void;
  trigger?: React.ReactNode;
};

function groupSlotsByDay(slots: MentorSlot[]) {
  const map = new Map<string, MentorSlot[]>();
  for (const slot of slots) {
    const key = format(parseISO(slot.startAt), "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(slot);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function ConsultBookSlotDialog({
  consultantId,
  consultantName,
  priceInr: sessionPoints,
  durationMinutes,
  disabled,
  onBooked,
  trigger,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MentorSlot | null>(null);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"slot" | "pay" | "done">("slot");
  const [busy, setBusy] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);

  const { data: me } = useGetMe({ query: { enabled: open } });

  const { data: mySessions } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.list("requester"),
    queryFn: () => consultApi.listConsultations("requester"),
    enabled: open,
  });

  const existingWithMentor = mySessions?.find(
    (s) => s.consultantId === consultantId && ACTIVE_WITH_MENTOR.includes(s.status),
  );

  const { data: slotsData, isLoading, refetch: refetchSlots } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.slots(consultantId),
    queryFn: () => consultApi.getMentorSlots(consultantId),
    enabled: open,
  });

  const { data: payConfig } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.videoConfig,
    queryFn: () => consultApi.getVideoConfig(),
    enabled: open && sessionPoints > 0,
  });

  const grouped = useMemo(() => groupSlotsByDay(slotsData?.slots ?? []), [slotsData?.slots]);
  const isFree = sessionPoints <= 0;
  const weeklySchedule = slotsData?.weeklySchedule ?? [];
  const openCount = slotsData?.slots?.length ?? 0;
  const notConfigured = slotsData && !slotsData.availabilityConfigured;
  const balance = payConfig?.pointsBalance ?? me?.totalPoints ?? 0;
  const canAfford = isFree || balance >= sessionPoints;

  useEffect(() => {
    if (!open) {
      setSelectedSlot(null);
      setMessage("");
      setStep("slot");
      setBookingId(null);
      setMeetingLink(null);
      setPayConfirmOpen(false);
    }
  }, [open]);

  const invalidateAfterBook = () => {
    queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.slots(consultantId) });
    queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.list("all") });
    queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.experts() });
  };

  const handleReserve = async () => {
    if (!selectedSlot || existingWithMentor) return;
    setBusy(true);
    try {
      const booking = await consultApi.bookConsultation({
        consultantId,
        slotStartAt: selectedSlot.startAt,
        message: message.trim() || undefined,
      });
      setBookingId(booking.id);
      invalidateAfterBook();

      if (booking.status === "pending_payment" && sessionPoints > 0) {
        setStep("pay");
        return;
      }

      if (booking.status === "scheduled" || booking.meetingLink) {
        setMeetingLink(booking.meetingLink);
        setStep("done");
        onBooked?.();
        return;
      }

      setStep("pay");
    } catch (err) {
      toast({
        title: "Could not book",
        description: err instanceof Error ? err.message : "Try another slot",
        variant: "destructive",
      });
      void refetchSlots();
    } finally {
      setBusy(false);
    }
  };

  const handlePay = async () => {
    if (!bookingId) return;
    setPayConfirmOpen(false);
    setBusy(true);
    try {
      const result = await consultApi.confirmPayment(bookingId);
      setMeetingLink(result.meetingLink ?? result.payment?.meetingLink ?? null);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      invalidateAfterBook();
      setStep("done");
      toast({
        title: "Booking confirmed",
        description:
          result.payment?.chargeNote
          ?? `${sessionPoints} pts will be charged when the session goes live.`,
      });
      onBooked?.();
    } catch (err) {
      toast({
        title: "Payment failed",
        description: err instanceof Error ? err.message : "Could not deduct points",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" disabled={disabled || busy}>
              <Video className="w-4 h-4 mr-1" />
              Book session
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book with {consultantName}</DialogTitle>
            <DialogDescription>
              Pick an open slot · {durationMinutes} min
              {isFree ? " · Free" : ` · ${sessionPoints} pts`}
            </DialogDescription>
          </DialogHeader>

          {existingWithMentor && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <p className="font-medium">You already have a session with this mentor</p>
              <p className="text-xs mt-1">
                {existingWithMentor.status === "pending_payment"
                  ? "Complete payment or cancel it from My Sessions before booking again."
                  : "Finish or cancel your current session before booking another slot."}
              </p>
              <Button asChild variant="link" className="h-auto p-0 mt-1 text-amber-900">
                <Link href="/consult?tab=sessions">Go to My Sessions</Link>
              </Button>
            </div>
          )}

          {step === "slot" && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/80">How it works</p>
                <p>
                  1. Reserve slot → 2. {isFree ? "Confirm" : "Confirm booking (pts charged when live)"} → 3. Join call →
                  4. Mark complete (mentor gets pts)
                </p>
                {weeklySchedule.length > 0 && (
                  <p className="text-[11px] pt-0.5">Mentor hours: {weeklySchedule.join(" · ")}</p>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : notConfigured ? (
                <p className="text-sm text-muted-foreground text-center py-8 rounded-lg border border-dashed">
                  This mentor has not set weekly hours yet.
                </p>
              ) : grouped.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 rounded-lg border border-dashed">
                  No open slots in the next 2 weeks.
                </p>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {grouped.map(([day, daySlots]) => (
                    <div key={day}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(parseISO(day), "EEE, MMM d")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {daySlots.map((slot) => {
                          const active = selectedSlot?.startAt === slot.startAt;
                          return (
                            <button
                              key={slot.startAt}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              disabled={Boolean(existingWithMentor)}
                              className={cn(
                                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background hover:border-primary/40",
                                existingWithMentor && "opacity-50 cursor-not-allowed",
                              )}
                            >
                              <Clock className="inline h-3.5 w-3.5 mr-1 opacity-70" />
                              {format(parseISO(slot.startAt), "h:mm a")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {openCount > 0 && !existingWithMentor && (
                <p className="text-xs text-emerald-700 font-medium">
                  {openCount} open slot{openCount === 1 ? "" : "s"} available
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="book-msg">What do you need help with? (optional)</Label>
                <Textarea
                  id="book-msg"
                  rows={3}
                  placeholder="Interview prep, resume review, career switch…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={busy || Boolean(existingWithMentor)}
                />
              </div>
            </div>
          )}

          {step === "pay" && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <p className="text-sm font-medium">Confirm your booking</p>
                <div className="flex items-baseline gap-2">
                  <Trophy className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-2xl font-bold">{sessionPoints} pts</p>
                  <span className="text-sm text-muted-foreground">when session goes live</span>
                </div>
                {selectedSlot && (
                  <Badge variant="secondary" className="rounded-full">
                    {format(parseISO(selectedSlot.startAt), "MMM d · h:mm a")}
                  </Badge>
                )}
                <div className="rounded-lg bg-background border px-3 py-2.5 text-sm space-y-1">
                  <p>
                    Your balance: <strong>{balance} pts</strong> (must stay available until the call)
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Points are <strong>not charged now</strong>. They deduct when your mentor joins and the session goes <strong>Live</strong>.
                  </p>
                  {!canAfford && (
                    <p className="text-destructive text-xs">
                      Need {sessionPoints - balance} more pts — buy from Profile.
                    </p>
                  )}
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Cancel before the call → no points charged.</li>
                  <li>After the session goes live → cancel is blocked; use dispute if something went wrong.</li>
                  <li>Mentor receives {sessionPoints} pts when you mark the session complete.</li>
                </ul>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3 py-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Video className="h-6 w-6" />
              </div>
              <p className="font-semibold">You&apos;re all set!</p>
              <p className="text-sm text-muted-foreground">
                Join from <strong>My Sessions</strong> at the scheduled time.
              </p>
              {meetingLink && (
                <Button asChild className="w-full rounded-xl">
                  <a href={meetingLink} target="_blank" rel="noopener noreferrer">
                    Open session room
                  </a>
                </Button>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {step === "slot" && (
              <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReserve}
                  disabled={
                    busy
                    || !selectedSlot
                    || notConfigured
                    || grouped.length === 0
                    || Boolean(existingWithMentor)
                  }
                >
                  {busy ? "Reserving…" : isFree ? "Confirm booking" : "Reserve slot"}
                </Button>
              </>
            )}
            {step === "pay" && (
              <>
                <Button variant="outline" onClick={() => setStep("slot")} disabled={busy}>
                  Back
                </Button>
                <Button
                  onClick={() => setPayConfirmOpen(true)}
                  disabled={busy || !canAfford}
                >
                  <Trophy className="h-4 w-4 mr-1.5" />
                  Confirm booking
                </Button>
              </>
            )}
            {step === "done" && (
              <Button className="w-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={payConfirmOpen} onOpenChange={setPayConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm booking · {sessionPoints} pts when live?</AlertDialogTitle>
            <AlertDialogDescription>
              Your slot will be reserved. <strong>{sessionPoints} pts</strong> are charged only when
              your mentor joins and the session goes live — not now. Cancel before the call starts
              to avoid any charge. Mentor earns points after you mark the session complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={handlePay} disabled={busy}>
              {busy ? "Processing…" : `Yes, confirm (${sessionPoints} pts when live)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
