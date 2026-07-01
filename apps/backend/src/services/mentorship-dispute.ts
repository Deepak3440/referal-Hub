import { ConsultationModel } from "@workspace/db";
import {
  creditMentorForSession,
  refundSessionPoints,
  releaseSessionReservation,
  sessionPointsCost,
} from "./mentorship-points";

export type DisputeResolution = "refund" | "mentor" | "dismiss";

export async function raiseSessionDispute(
  consultationId: number,
  requesterId: number,
  reason: string,
): Promise<void> {
  const row = await ConsultationModel.findOne({ id: consultationId }).lean();
  if (!row) throw new Error("Consultation not found");
  if (row.requesterId !== requesterId) {
    throw new Error("Only the student can raise a dispute");
  }
  if (row.disputeStatus === "open") {
    throw new Error("A dispute is already open for this session");
  }
  if (!["started", "completed", "waiting_for_participants"].includes(row.status)) {
    throw new Error("Disputes can only be raised after the session has started");
  }
  if (!row.pointsDeducted) {
    throw new Error("No points were charged for this session");
  }
  if (row.mentorPointsCredited) {
    throw new Error("Mentor has already been paid — contact support for billing issues");
  }

  const trimmed = reason.trim();
  if (trimmed.length < 20) {
    throw new Error("Please describe the issue in at least 20 characters");
  }

  await ConsultationModel.updateOne(
    { id: consultationId },
    {
      disputeStatus: "open",
      disputeReason: trimmed.slice(0, 2000),
      disputeRaisedAt: new Date(),
    },
  );
}

export async function resolveSessionDispute(
  consultationId: number,
  resolution: DisputeResolution,
  adminNote?: string,
): Promise<void> {
  const row = await ConsultationModel.findOne({ id: consultationId }).lean();
  if (!row) throw new Error("Consultation not found");
  if (row.disputeStatus !== "open") {
    throw new Error("No open dispute for this session");
  }

  const amount = sessionPointsCost(row.amountPoints ?? row.amountInr ?? 0);
  const now = new Date();
  const note = adminNote?.trim().slice(0, 1000) ?? null;

  if (resolution === "refund") {
    await refundSessionPoints(consultationId, row.requesterId, amount);
    await ConsultationModel.updateOne(
      { id: consultationId },
      {
        status: "cancelled",
        sessionStatus: "cancelled",
        meetingStatus: "cancelled",
        disputeStatus: "resolved_refund",
        disputeResolvedAt: now,
        disputeAdminNote: note,
      },
    );
    return;
  }

  if (resolution === "mentor") {
    await creditMentorForSession(consultationId, row.consultantId, amount);
    await ConsultationModel.updateOne(
      { id: consultationId },
      {
        status: "completed",
        sessionStatus: "completed",
        meetingStatus: "completed",
        actualEndAt: row.actualEndAt ?? now,
        disputeStatus: "resolved_mentor",
        disputeResolvedAt: now,
        disputeAdminNote: note,
      },
    );
    return;
  }

  // Dismiss complaint — mentor keeps payment if session went live
  if (row.pointsDeducted) {
    await creditMentorForSession(consultationId, row.consultantId, amount);
    await ConsultationModel.updateOne(
      { id: consultationId },
      {
        status: "completed",
        sessionStatus: "completed",
        meetingStatus: "completed",
        disputeStatus: "resolved_dismissed",
        disputeResolvedAt: now,
        disputeAdminNote: note,
      },
    );
    return;
  }

  await releaseSessionReservation(consultationId);
  await ConsultationModel.updateOne(
    { id: consultationId },
    {
      disputeStatus: "resolved_dismissed",
      disputeResolvedAt: now,
      disputeAdminNote: note,
    },
  );
}

export async function listOpenDisputes() {
  return ConsultationModel.find({ disputeStatus: "open" })
    .sort({ disputeRaisedAt: -1 })
    .lean();
}
