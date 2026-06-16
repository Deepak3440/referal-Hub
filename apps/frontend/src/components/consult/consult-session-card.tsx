import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, Clock, ExternalLink, User, Video } from "lucide-react";
import type { Consultation } from "@/lib/consult-api";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  scheduled: "bg-green-500/10 text-green-700 border-green-500/30",
  rejected: "bg-red-500/10 text-red-700 border-red-500/30",
  completed: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/30",
};

type ConsultSessionCardProps = {
  session: Consultation;
  currentUserId: number;
  onRespond?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
};

export function ConsultSessionCard({
  session,
  currentUserId,
  onRespond,
  onCancel,
  onComplete,
}: ConsultSessionCardProps) {
  const isConsultant = session.consultantId === currentUserId;
  const other = isConsultant ? session.requester : session.consultant;
  const otherName = other?.fullName ?? "User";

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {isConsultant ? "Incoming request" : "Your request"}
          </p>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">{otherName}</span>
            <Badge variant="outline" className={cn("text-xs", STATUS_STYLE[session.status])}>
              {session.status}
            </Badge>
          </div>
        </div>
        {session.status === "pending" && isConsultant && onRespond && (
          <Button size="sm" onClick={onRespond}>Respond & Book</Button>
        )}
      </div>

      {session.message && (
        <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">
          &ldquo;{session.message}&rdquo;
        </p>
      )}

      {session.status === "scheduled" && session.scheduledAt && (
        <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-green-700" />
              {format(new Date(session.scheduledAt), "EEE, MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-green-700" />
              {format(new Date(session.scheduledAt), "h:mm a")} · {session.durationMinutes} min
            </span>
          </div>
          {session.meetingLink && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
              <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                <Video className="w-4 h-4" />
                Google Meet ready
              </div>
              <Button asChild size="sm" variant="default" className="h-8">
                <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">
                  Join Meeting <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {session.status === "scheduled" && onComplete && isConsultant && (
          <Button variant="outline" size="sm" onClick={onComplete}>Mark Complete</Button>
        )}
        {["pending", "scheduled"].includes(session.status) && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </div>
  );
}
