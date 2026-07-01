import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { consultApi, CONSULT_QUERY_KEYS } from "@/lib/consult-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import {
  canEnterVideoRoom,
  getSessionJoinWindow,
  JOIN_EARLY_MINUTES,
  sessionPointsLabel,
  sessionStatusLabel,
} from "@/lib/mentor-utils";
import { useToast } from "@/hooks/use-toast";
import {
  Video,
  Calendar,
  Clock,
  ArrowLeft,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function ConsultSessionPage() {
  const params = useParams<{ id: string }>();
  const consultationId = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [entered, setEntered] = useState(false);
  const [joining, setJoining] = useState(false);

  const { data: session, isLoading } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.detail(consultationId),
    queryFn: () => consultApi.getConsultation(consultationId),
    enabled: Number.isFinite(consultationId) && consultationId > 0,
    refetchInterval: entered ? 12_000 : false,
  });

  if (isLoading || !session) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const other =
    session.requester && session.consultant
      ? `with ${session.consultant.fullName}`
      : "";

  const joinWindow = getSessionJoinWindow(session);
  const roomOpen = canEnterVideoRoom(session);
  const isLive = session.status === "started";
  const statusLabel = sessionStatusLabel(session);

  const handleEnterRoom = async () => {
    if (!roomOpen) return;
    setJoining(true);
    try {
      await consultApi.joinConsultation(consultationId);
      setEntered(true);
      queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.detail(consultationId) });
      queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.list("all") });
    } catch (err) {
      toast({
        title: "Could not enter room",
        description: err instanceof Error ? err.message : "Try again at your scheduled time",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const embedUrl = session.meetingLink
    ? `${session.meetingLink}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false`
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/consult?tab=sessions">
          <ArrowLeft className="h-4 w-4 mr-1" />
          My sessions
        </Link>
      </Button>

      <PageHeader
        title="Video session"
        description={`Mentorship session ${other}`.trim()}
      />

      <div className="rounded-2xl border bg-card p-4 sm:p-6 space-y-4 shadow-sm">
        {session.scheduledAt && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(session.scheduledAt), "EEE, MMM d yyyy")}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {format(new Date(session.scheduledAt), "h:mm a")} · {session.durationMinutes} min
            </span>
            <span
              className={
                isLive
                  ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium px-2.5 py-0.5"
                  : "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              }
            >
              {isLive && (
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              )}
              {statusLabel}
            </span>
          </div>
        )}

        {isLive && session.pointsDeducted && (
          <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {session.amountPoints || session.amountInr} pts charged — mentor is paid after you mark
            the session complete.
          </p>
        )}

        {!isLive && session.pointsReserved && !session.pointsDeducted && (
          <p className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2">
            {sessionPointsLabel(session)} — charged only when your mentor joins and the session goes
            live.
          </p>
        )}

        {joinWindow?.isTooEarly && !isLive && (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center space-y-2">
            <Video className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="font-medium">Room not open yet</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              You can enter {JOIN_EARLY_MINUTES} minutes before your slot — from{" "}
              <strong>{format(joinWindow.opensAt, "h:mm a")}</strong> on{" "}
              {format(joinWindow.opensAt, "MMM d")}.
            </p>
          </div>
        )}

        {!session.meetingLink && (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
            Meeting link will appear after you confirm your booking.
          </p>
        )}

        {session.meetingLink && roomOpen && !entered && (
          <div className="text-center space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              {isLive
                ? "Your session is in progress. Enter to rejoin the call."
                : "When you enter, your mentor will be notified. Points charge when they join."}
            </p>
            <Button
              size="lg"
              className="rounded-xl"
              disabled={joining}
              onClick={handleEnterRoom}
            >
              {joining ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 mr-2" />
                  {isLive ? "Rejoin video call" : "Enter video room"}
                </>
              )}
            </Button>
          </div>
        )}

        {entered && embedUrl && (
          <>
            <div className="overflow-hidden rounded-xl border bg-black/5">
              <iframe
                title="Jitsi video session"
                src={embedUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full min-h-[60vh] sm:min-h-[70vh] border-0"
              />
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={session.meetingLink!} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Open in new tab
              </a>
            </Button>
          </>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          Live status appears only after your mentor joins during the scheduled window. Cancel freely
          before that. After points are charged, use <strong>Report issue</strong> in My Sessions if
          needed.
        </p>
      </div>
    </div>
  );
}
