import { ConsultationModel } from "@workspace/db";
import { createConsultationMeeting } from "./jitsi-meeting";
import { deductPointsOnSessionLive } from "./mentorship-points";
import {
  formatJoinOpensMessage,
  getSessionJoinWindow,
} from "../lib/mentorship-session-window";

const AUTO_COMPLETE_GRACE_MS = 15 * 60 * 1000;

type JoinRole = "consultant" | "customer";

/** Mark overdue started sessions as completed (scheduled end + 15 min). */
export async function cleanupExpiredJitsiSessions(): Promise<number> {
  const now = Date.now();
  const rows = await ConsultationModel.find({
    sessionStatus: "started",
    status: { $in: ["started", "waiting_for_participants", "scheduled"] },
    scheduledEndAt: { $ne: null },
  }).lean();

  let count = 0;
  for (const row of rows) {
    const endMs = row.scheduledEndAt?.getTime() ?? 0;
    if (!endMs || now < endMs + AUTO_COMPLETE_GRACE_MS) continue;

    await ConsultationModel.updateOne(
      { id: row.id },
      {
        status: "completed",
        sessionStatus: "completed",
        meetingStatus: "completed",
        actualEndAt: new Date(),
        durationSeconds: row.actualStartAt
          ? Math.max(0, Math.floor((now - row.actualStartAt.getTime()) / 1000))
          : row.durationSeconds,
      },
    );

    count += 1;
  }

  return count;
}

export async function recordConsultationJoin(
  consultationId: number,
  userId: number,
): Promise<void> {
  const row = await ConsultationModel.findOne({ id: consultationId }).lean();
  if (!row) throw new Error("Consultation not found");

  const isConsultant = row.consultantId === userId;
  const isCustomer = row.requesterId === userId;
  if (!isConsultant && !isCustomer) {
    throw new Error("You are not part of this session");
  }

  if (!row.scheduledAt) {
    throw new Error("Session has no scheduled time");
  }

  const window = getSessionJoinWindow(
    row.scheduledAt,
    row.scheduledEndAt ?? null,
    row.durationMinutes ?? 30,
  );

  if (window.isTooEarly) {
    throw new Error(formatJoinOpensMessage(window.opensAt));
  }
  if (window.isPast && row.status !== "started") {
    throw new Error("This session window has ended. Mark it complete or report an issue from My Sessions.");
  }

  const role: JoinRole = isConsultant ? "consultant" : "customer";
  const now = new Date();
  const participants = [...(row.participants ?? [])];
  const idx = participants.findIndex((p) => p.userId === userId);
  if (idx === -1) {
    participants.push({ userId, role, joinedAt: now, leftAt: null, durationSeconds: null });
  } else {
    participants[idx] = { ...participants[idx]!, joinedAt: now, leftAt: null };
  }

  const updates: Record<string, unknown> = { participants };

  if (isConsultant && ["scheduled", "waiting_for_participants"].includes(row.status)) {
    if (!window.isOpen && row.status !== "started") {
      throw new Error(formatJoinOpensMessage(window.opensAt));
    }
    if ((row.amountPoints ?? row.amountInr ?? 0) > 0) {
      await deductPointsOnSessionLive(consultationId);
    }
    updates.sessionStatus = "started";
    updates.status = "started";
    updates.meetingStatus = "started";
    updates.actualStartAt = row.actualStartAt ?? now;
  } else if (
    isCustomer
    && row.sessionStatus === "scheduled"
    && !row.actualStartAt
    && window.isOpen
  ) {
    updates.meetingStatus = "waiting_for_participants";
    if (row.status === "scheduled") {
      updates.status = "waiting_for_participants";
    }
  }

  await ConsultationModel.updateOne({ id: consultationId }, updates);
}

export function jitsiMeetingDbFields(consultationId: number) {
  const meeting = createConsultationMeeting(consultationId);
  return {
    videoProvider: meeting.videoProvider,
    roomName: meeting.roomName,
    roomId: meeting.roomName,
    meetingLink: meeting.meetingLink,
    sessionStatus: "scheduled" as const,
    meetingStatus: "scheduled" as const,
  };
}
