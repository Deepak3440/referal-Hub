import { ConsultationModel } from "@workspace/db";
import { createConsultationMeeting, isMentorshipPaymentEnabled } from "./jitsi-meeting";
import { jitsiMeetingDbFields } from "./jitsi-session";
import { getUserPointsBalance, reserveSessionPoints, sessionPointsCost } from "./mentorship-points";

export type PaymentConfirmResult = {
  paymentStatus: "authorized" | "not_required";
  paymentMethod: "points" | "none";
  paymentRef: string | null;
  pointsReserved: number;
  pointsDeducted: number;
  balanceAfter: number | null;
  meetingLink: string;
  roomName: string;
  videoProvider: string;
  chargeNote: string;
};

export async function confirmConsultationPayment(
  consultationId: number,
  payerUserId: number,
): Promise<PaymentConfirmResult> {
  const row = await ConsultationModel.findOne({ id: consultationId }).lean();
  if (!row) {
    throw new Error("Consultation not found");
  }
  if (row.requesterId !== payerUserId) {
    throw new Error("Only the mentee can complete payment");
  }
  if (!["pending_payment", "pending"].includes(row.status)) {
    throw new Error("This session is not awaiting payment");
  }
  if (!row.scheduledAt) {
    throw new Error("Session has no scheduled time");
  }

  const amountPoints = sessionPointsCost(row.amountPoints ?? row.amountInr ?? 0);
  const needsPayment = amountPoints > 0;

  if (needsPayment && !isMentorshipPaymentEnabled()) {
    throw new Error("Mentorship payments are disabled");
  }

  let paymentRef: string | null = null;
  let balanceAfter: number | null = null;
  const paymentStatus = needsPayment ? "authorized" : "not_required";

  if (needsPayment) {
    const reservation = await reserveSessionPoints(consultationId, payerUserId, amountPoints);
    paymentRef = reservation.paymentRef;
    balanceAfter = reservation.balanceAfter;
  } else {
    balanceAfter = await getUserPointsBalance(payerUserId);
  }

  const meeting = createConsultationMeeting(consultationId);
  const jitsiFields = jitsiMeetingDbFields(consultationId);

  await ConsultationModel.updateOne(
    { id: consultationId },
    {
      status: "scheduled",
      paymentStatus,
      paymentRef,
      pointsReserved: needsPayment,
      ...jitsiFields,
    },
  );

  return {
    paymentStatus,
    paymentMethod: needsPayment ? "points" : "none",
    paymentRef,
    pointsReserved: needsPayment ? amountPoints : 0,
    pointsDeducted: 0,
    balanceAfter,
    meetingLink: meeting.meetingLink,
    roomName: meeting.roomName,
    videoProvider: meeting.videoProvider,
    chargeNote: needsPayment
      ? `${amountPoints} pts will be charged when the session goes live (mentor joins).`
      : "Free session — no points charged.",
  };
}
