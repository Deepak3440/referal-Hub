import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  MessageSquare,
  Trophy,
  User,
  Video,
  XCircle,
} from "lucide-react";
import type { Consultation } from "@/lib/consult-api";
import { canMarkSessionComplete, canRaiseSessionDispute, canEnterVideoRoom, getSessionJoinWindow, sessionPointsLabel, sessionStatusLabel } from "@/lib/mentor-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  pending_payment: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  scheduled: "bg-success/10 text-success border-success/30",
  waiting_for_participants: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  started: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  rejected: "bg-red-500/10 text-red-700 border-red-500/30",
  completed: "bg-primary/10 text-primary border-primary/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function SessionStatusBadge({ session }: { session: Consultation }) {
  const label = sessionStatusLabel(session);
  const isLive = session.status === "started";

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs",
        STATUS_STYLE[session.status],
        isLive && "border-emerald-600 text-emerald-700 bg-emerald-50",
      )}
    >
      {isLive && (
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
      )}
      {label}
    </Badge>
  );
}

const JOINABLE = ["scheduled", "waiting_for_participants", "started"];

function CancelSessionButton({
  otherName,
  pointsWillRefund,
  pointsNotChargedYet,
  onConfirm,
  disabled,
}: {
  otherName: string;
  pointsWillRefund?: boolean;
  pointsNotChargedYet?: boolean;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-8 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <XCircle className="h-3.5 w-3.5 mr-1.5" />
        Cancel
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
          <AlertDialogDescription>
            Your session with <strong>{otherName}</strong> will be cancelled.
            {pointsNotChargedYet && (
              <span className="block mt-2 text-emerald-700">
                No points have been charged yet — you can cancel freely.
              </span>
            )}
            {pointsWillRefund && (
              <span className="block mt-2">Charged points will be refunded to the student.</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep session</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Yes, cancel
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CompleteSessionButton({
  otherName,
  pointsNote,
  onConfirm,
  disabled,
}: {
  otherName: string;
  pointsNote?: string | null;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-8 rounded-full border-emerald-500/40 text-emerald-700 hover:bg-emerald-50"
        onClick={() => setOpen(true)}
      >
        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
        Mark complete
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark session as complete?</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm your call with <strong>{otherName}</strong> has finished.
            {pointsNote && (
              <span className="block mt-2">
                {pointsNote} will be released to your mentor&apos;s wallet.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Yes, complete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DisputeSessionButton({
  onConfirm,
  disabled,
}: {
  onConfirm: (reason: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-8 rounded-full border-amber-500/50 text-amber-800 hover:bg-amber-50"
        onClick={() => setOpen(true)}
      >
        <Flag className="h-3.5 w-3.5 mr-1.5" />
        Report issue
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report a problem with this session</AlertDialogTitle>
          <AlertDialogDescription>
            Use this if the mentor did not deliver the full session or something went wrong after
            points were charged. Our team will review manually — refunds are not automatic.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor="dispute-reason">What happened?</Label>
          <Textarea
            id="dispute-reason"
            rows={4}
            placeholder="e.g. Mentor left after 10 minutes, audio did not work, no-show after I joined…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction
            disabled={reason.trim().length < 20}
            onClick={() => {
              onConfirm(reason.trim());
              setReason("");
              setOpen(false);
            }}
          >
            Submit for review
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SessionActions({
  session,
  isConsultant,
  onPay,
  onCancel,
  onComplete,
  onDispute,
  actionsDisabled,
}: {
  session: Consultation;
  isConsultant: boolean;
  onPay?: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onDispute?: (reason: string) => void;
  actionsDisabled?: boolean;
}) {
  const otherName = (isConsultant ? session.requester : session.consultant)?.fullName ?? "User";
  const canCancel = ["pending", "pending_payment", "scheduled", "waiting_for_participants"].includes(
    session.status,
  );
  const showComplete = canMarkSessionComplete(session);
  const showDispute = !isConsultant && onDispute && canRaiseSessionDispute(session);
  const pts = session.amountPoints || session.amountInr;
  const canJoin = canEnterVideoRoom(session);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {session.status === "pending_payment" && !isConsultant && onPay && (
        <Button size="sm" className="h-8 rounded-full" disabled={actionsDisabled} onClick={onPay}>
          <Trophy className="h-3.5 w-3.5 mr-1.5" />
          Confirm · {pts} pts when live
        </Button>
      )}
      {session.disputeStatus === "open" && (
        <Badge variant="outline" className="rounded-full border-amber-500 text-amber-800">
          Under review
        </Badge>
      )}
      {JOINABLE.includes(session.status) && session.meetingLink && canJoin && (
        <Button asChild size="sm" className="h-8 rounded-full">
          <Link href={`/consult/session/${session.id}`}>
            <Video className="h-3.5 w-3.5 mr-1.5" />
            {session.status === "started" ? "Rejoin call" : "Join session"}
          </Link>
        </Button>
      )}
      {showComplete && (
        <CompleteSessionButton
          otherName={otherName}
          pointsNote={
            isConsultant && pts > 0 && session.pointsDeducted
              ? `${pts} pts`
              : !isConsultant && pts > 0
                ? `${pts} pts`
                : null
          }
          onConfirm={onComplete}
          disabled={actionsDisabled}
        />
      )}
      {showDispute && (
        <DisputeSessionButton
          onConfirm={onDispute}
          disabled={actionsDisabled}
        />
      )}
      {session.status === "started" && isConsultant && (
        <p className="w-full text-[11px] text-muted-foreground text-right basis-full">
          Live — use Mark complete when done. Cancel is not available during the call.
        </p>
      )}
      {session.status === "started" && !isConsultant && !showDispute && session.pointsDeducted && (
        <p className="w-full text-[11px] text-muted-foreground text-right basis-full">
          Something wrong? Use Report issue — admin will review.
        </p>
      )}
      {canCancel && (
        <CancelSessionButton
          otherName={otherName}
          pointsNotChargedYet={session.pointsReserved && !session.pointsDeducted}
          pointsWillRefund={session.pointsDeducted && !session.mentorPointsCredited}
          onConfirm={onCancel}
          disabled={actionsDisabled}
        />
      )}
    </div>
  );
}

function SessionWhen({ session }: { session: Consultation }) {
  const joinWindow = getSessionJoinWindow(session);

  if (session.scheduledAt) {
    return (
      <div className="space-y-0.5 text-sm">
        <p className="flex items-center gap-1.5 font-medium">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {format(new Date(session.scheduledAt), "MMM d, yyyy")}
        </p>
        <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Clock className="h-3.5 w-3.5" />
          {format(new Date(session.scheduledAt), "h:mm a")} · {session.durationMinutes} min
          {sessionPointsLabel(session) && ` · ${sessionPointsLabel(session)}`}
        </p>
        {joinWindow?.isTooEarly && session.status === "scheduled" && (
          <p className="text-[11px] text-muted-foreground">
            Join opens {format(joinWindow.opensAt, "h:mm a")}
          </p>
        )}
      </div>
    );
  }

  if (session.createdAt) {
    return (
      <p className="text-sm text-muted-foreground">
        Created {format(new Date(session.createdAt), "MMM d, yyyy")}
      </p>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

type ConsultSessionsTableProps = {
  title: string;
  sessions: Consultation[];
  meId: number;
  onPay?: (session: Consultation) => void;
  onCancel: (id: number) => void;
  onComplete: (id: number) => void;
  onDispute?: (id: number, reason: string) => void;
  actionsDisabled?: boolean;
};

export function ConsultSessionsTable({
  title,
  sessions,
  meId,
  onPay,
  onCancel,
  onComplete,
  onDispute,
  actionsDisabled,
}: ConsultSessionsTableProps) {
  if (!sessions.length) return null;

  return (
    <section className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="rounded-full font-normal">
          {sessions.length}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4 w-[28%]">With</TableHead>
            <TableHead className="hidden md:table-cell w-[18%]">Status</TableHead>
            <TableHead className="hidden sm:table-cell w-[22%]">When</TableHead>
            <TableHead className="hidden lg:table-cell">Note</TableHead>
            <TableHead className="text-right pr-4 w-[30%]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const isConsultant = session.consultantId === meId;
            const other = isConsultant ? session.requester : session.consultant;
            const otherName = other?.fullName ?? "User";

            return (
              <TableRow key={session.id}>
                <TableCell className="pl-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{otherName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {isConsultant ? "Mentee" : "Mentor"}
                        </p>
                      </div>
                    </div>
                    <div className="md:hidden">
                      <SessionStatusBadge session={session} />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <SessionStatusBadge session={session} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <SessionWhen session={session} />
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[220px]">
                  {session.message ? (
                    <p className="flex items-start gap-1.5 text-sm text-muted-foreground line-clamp-2">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{session.message}</span>
                    </p>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="pr-4">
                  <SessionActions
                    session={session}
                    isConsultant={isConsultant}
                    onPay={
                      session.status === "pending_payment" && !isConsultant && onPay
                        ? () => onPay(session)
                        : undefined
                    }
                    onCancel={() => onCancel(session.id)}
                    onComplete={() => onComplete(session.id)}
                    onDispute={
                      onDispute && !isConsultant
                        ? (reason) => onDispute(session.id, reason)
                        : undefined
                    }
                    actionsDisabled={actionsDisabled}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
