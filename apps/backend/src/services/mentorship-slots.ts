import { ConsultationModel, UserModel } from "@workspace/db";
import {
  generateSlotsFromAvailability,
  resolveConsultantAvailability,
  hasConfiguredAvailability,
  formatWeeklyAvailabilitySummary,
  type MentorSlot,
  type WeeklyAvailabilityBlock,
} from "../lib/mentorship-availability";
import { releaseStalePendingPayments, assertSlotNotAlreadyBooked } from "./mentorship-booking-guard";

const ACTIVE_BOOKING_STATUSES = [
  "pending_payment",
  "scheduled",
  "waiting_for_participants",
  "started",
  "pending",
] as const;

export async function getConsultantSlots(
  consultantId: number,
  fromIso: string,
  toIso: string,
): Promise<MentorSlot[]> {
  const meta = await getConsultantSlotsMeta(consultantId, fromIso, toIso);
  return meta.slots;
}

export type ConsultantSlotsMeta = {
  slots: MentorSlot[];
  availabilityConfigured: boolean;
  weeklySchedule: string[];
  durationMinutes: number;
};

export async function getConsultantSlotsMeta(
  consultantId: number,
  fromIso: string,
  toIso: string,
): Promise<ConsultantSlotsMeta> {
  await releaseStalePendingPayments(consultantId);

  const consultant = await UserModel.findOne({ id: consultantId, isConsultant: true }).lean();
  if (!consultant) {
    return { slots: [], availabilityConfigured: false, weeklySchedule: [], durationMinutes: 30 };
  }

  const duration = consultant.mentorshipDurationMinutes ?? 30;
  const blocks = consultant.mentorshipWeeklyAvailability as WeeklyAvailabilityBlock[] | undefined;
  const availabilityConfigured = hasConfiguredAvailability(blocks);
  const availability = resolveConsultantAvailability(blocks);
  const weeklySchedule = formatWeeklyAvailabilitySummary(availability);

  if (!availabilityConfigured) {
    return { slots: [], availabilityConfigured: false, weeklySchedule: [], durationMinutes: duration };
  }

  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { slots: [], availabilityConfigured: true, weeklySchedule, durationMinutes: duration };
  }

  const booked = await ConsultationModel.find({
    consultantId,
    status: { $in: [...ACTIVE_BOOKING_STATUSES] },
    scheduledAt: { $gte: from, $lte: to },
  })
    .select("scheduledAt")
    .lean();

  const bookedStarts = booked
    .map((b) => b.scheduledAt)
    .filter((d): d is Date => d != null);

  const slots = generateSlotsFromAvailability({
    availability,
    durationMinutes: duration,
    from,
    to,
    bookedStarts,
  });

  return { slots, availabilityConfigured: true, weeklySchedule, durationMinutes: duration };
}

export async function assertSlotAvailable(
  consultantId: number,
  slotStartIso: string,
  durationMinutes: number,
): Promise<void> {
  const slotStart = new Date(slotStartIso);
  if (Number.isNaN(slotStart.getTime())) {
    throw new Error("Invalid slot time");
  }
  if (slotStart.getTime() <= Date.now() + 30 * 60_000) {
    throw new Error("Pick a slot at least 30 minutes from now");
  }

  const to = new Date(slotStart.getTime() + 14 * 24 * 60 * 60_000);
  const slots = await getConsultantSlots(consultantId, slotStartIso, to.toISOString());
  const slotMs = slotStart.getTime();
  const match = slots.some((s) => new Date(s.startAt).getTime() === slotMs);
  if (!match) {
    throw new Error("This slot is no longer available. Pick another time.");
  }

  await assertSlotNotAlreadyBooked(consultantId, slotStart);
}
