import { ConsultationModel } from "@workspace/db";

export const ACTIVE_MENTORSHIP_STATUSES = [
  "pending_payment",
  "scheduled",
  "waiting_for_participants",
  "started",
  "pending",
] as const;

const PENDING_PAYMENT_TTL_MS = 30 * 60 * 1000;

/** Cancel unpaid bookings older than 30 min so the slot opens again. */
export async function releaseStalePendingPayments(consultantId?: number): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_PAYMENT_TTL_MS);
  const filter: Record<string, unknown> = {
    status: "pending_payment",
    createdAt: { $lt: cutoff },
  };
  if (consultantId != null) filter.consultantId = consultantId;

  const stale = await ConsultationModel.find(filter).lean();
  for (const row of stale) {
    await ConsultationModel.updateOne(
      { id: row.id },
      { status: "cancelled", meetingStatus: "cancelled", paymentStatus: "refunded" },
    );
  }
  return stale.length;
}

export async function findActiveBookingBetween(
  requesterId: number,
  consultantId: number,
): Promise<{ id: number; status: string; scheduledAt: Date | null } | null> {
  const row = await ConsultationModel.findOne({
    requesterId,
    consultantId,
    status: { $in: [...ACTIVE_MENTORSHIP_STATUSES] },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!row) return null;
  return { id: row.id, status: row.status, scheduledAt: row.scheduledAt ?? null };
}

export async function assertCanBookWithMentor(
  requesterId: number,
  consultantId: number,
): Promise<void> {
  await releaseStalePendingPayments(consultantId);

  const existing = await findActiveBookingBetween(requesterId, consultantId);
  if (!existing) return;

  if (existing.status === "pending_payment") {
    throw new Error(
      "You already have an unpaid booking with this mentor. Pay or cancel it from My Sessions before booking again.",
    );
  }

  throw new Error(
    "You already have an active session with this mentor. Complete or cancel it before booking another slot.",
  );
}

export async function assertSlotNotAlreadyBooked(
  consultantId: number,
  slotStart: Date,
): Promise<void> {
  const slotMs = slotStart.getTime();
  const active = await ConsultationModel.find({
    consultantId,
    status: { $in: [...ACTIVE_MENTORSHIP_STATUSES] },
    scheduledAt: { $ne: null },
  })
    .select("scheduledAt")
    .lean();

  const taken = active.some((b) => b.scheduledAt && b.scheduledAt.getTime() === slotMs);
  if (taken) {
    throw new Error("This slot was just booked. Please pick another time.");
  }
}
