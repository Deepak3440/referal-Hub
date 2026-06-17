import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  User,
  Video,
  XCircle,
} from "lucide-react";
import type { Consultation } from "@/lib/consult-api";
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

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  scheduled: "bg-success/10 text-success border-success/30",
  rejected: "bg-red-500/10 text-red-700 border-red-500/30",
  completed: "bg-primary/10 text-primary border-primary/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  rejected: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
};

function CancelSessionButton({
  otherName,
  onConfirm,
  disabled,
}: {
  otherName: string;
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
            Your session with <strong>{otherName}</strong> will be cancelled. This cannot be undone.
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
            Yes, cancel session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SessionActions({
  session,
  isConsultant,
  onRespond,
  onCancel,
  onComplete,
  actionsDisabled,
}: {
  session: Consultation;
  isConsultant: boolean;
  onRespond?: () => void;
  onCancel: () => void;
  onComplete: () => void;
  actionsDisabled?: boolean;
}) {
  const otherName = (isConsultant ? session.requester : session.consultant)?.fullName ?? "User";
  const canCancel = ["pending", "scheduled"].includes(session.status);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {session.status === "pending" && isConsultant && onRespond && (
        <Button size="sm" className="h-8 rounded-full" disabled={actionsDisabled} onClick={onRespond}>
          Respond & Book
        </Button>
      )}
      {session.status === "scheduled" && session.meetingLink && (
        <Button asChild size="sm" className="h-8 rounded-full">
          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">
            <Video className="h-3.5 w-3.5 mr-1.5" />
            Join
            <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
          </a>
        </Button>
      )}
      {session.status === "scheduled" && isConsultant && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full"
          disabled={actionsDisabled}
          onClick={onComplete}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Complete
        </Button>
      )}
      {canCancel && (
        <CancelSessionButton
          otherName={otherName}
          onConfirm={onCancel}
          disabled={actionsDisabled}
        />
      )}
    </div>
  );
}

function SessionWhen({ session }: { session: Consultation }) {
  if (session.status === "scheduled" && session.scheduledAt) {
    return (
      <div className="space-y-0.5 text-sm">
        <p className="flex items-center gap-1.5 font-medium">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {format(new Date(session.scheduledAt), "MMM d, yyyy")}
        </p>
        <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Clock className="h-3.5 w-3.5" />
          {format(new Date(session.scheduledAt), "h:mm a")} · {session.durationMinutes} min
        </p>
      </div>
    );
  }

  if (session.createdAt) {
    return (
      <p className="text-sm text-muted-foreground">
        Requested {format(new Date(session.createdAt), "MMM d, yyyy")}
      </p>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

type ConsultSessionsTableProps = {
  title: string;
  sessions: Consultation[];
  meId: number;
  onRespond?: (session: Consultation) => void;
  onCancel: (id: number) => void;
  onComplete: (id: number) => void;
  actionsDisabled?: boolean;
};

export function ConsultSessionsTable({
  title,
  sessions,
  meId,
  onRespond,
  onCancel,
  onComplete,
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
                          {isConsultant ? "Incoming request" : "Your request"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] md:hidden", STATUS_STYLE[session.status])}
                    >
                      {STATUS_LABEL[session.status] ?? session.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className={cn("text-xs", STATUS_STYLE[session.status])}>
                    {STATUS_LABEL[session.status] ?? session.status}
                  </Badge>
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
                    onRespond={
                      session.status === "pending" && isConsultant && onRespond
                        ? () => onRespond(session)
                        : undefined
                    }
                    onCancel={() => onCancel(session.id)}
                    onComplete={() => onComplete(session.id)}
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
