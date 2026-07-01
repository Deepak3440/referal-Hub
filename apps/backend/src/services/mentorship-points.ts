import { ConsultationModel, UserModel } from "@workspace/db";

export function sessionPointsCost(amountPoints: number): number {
  return Math.max(0, Math.round(amountPoints));
}

/** Verify wallet balance — points are NOT moved yet (charged when session goes live). */
export async function reserveSessionPoints(
  consultationId: number,
  payerUserId: number,
  amountPoints: number,
): Promise<{ paymentRef: string; balanceAfter: number }> {
  const cost = sessionPointsCost(amountPoints);
  if (cost <= 0) {
    throw new Error("Invalid session points amount");
  }

  const payer = await UserModel.findOne({ id: payerUserId }).lean();
  if (!payer) throw new Error("User not found");
  if ((payer.totalPoints ?? 0) < cost) {
    throw new Error(
      `Not enough points (need ${cost} pts available, you have ${payer.totalPoints ?? 0} pts)`,
    );
  }

  const paymentRef = `mentor_hold_${Date.now()}_${payerUserId}`;
  await ConsultationModel.updateOne(
    { id: consultationId },
    {
      pointsReserved: true,
      paymentRef,
      paymentStatus: "authorized",
    },
  );

  return { paymentRef, balanceAfter: payer.totalPoints ?? 0 };
}

/** Deduct points when the mentorship session goes live (mentor joined). Idempotent. */
export async function deductPointsOnSessionLive(
  consultationId: number,
): Promise<{ deducted: number; alreadyDone: boolean }> {
  const row = await ConsultationModel.findOne({ id: consultationId }).lean();
  if (!row) throw new Error("Consultation not found");

  const cost = sessionPointsCost(row.amountPoints ?? row.amountInr ?? 0);
  if (cost <= 0) return { deducted: 0, alreadyDone: true };
  if (row.pointsDeducted) return { deducted: cost, alreadyDone: true };
  if (!row.pointsReserved && row.paymentStatus !== "authorized") {
    throw new Error("Session payment was not confirmed");
  }

  const payerUserId = row.requesterId;
  const updated = await UserModel.findOneAndUpdate(
    { id: payerUserId, totalPoints: { $gte: cost } },
    { $inc: { totalPoints: -cost } },
    { new: true },
  ).lean();

  if (!updated) {
    throw new Error(
      `Student no longer has enough points (${cost} pts required). Ask them to top up before joining.`,
    );
  }

  await ConsultationModel.updateOne(
    { id: consultationId },
    {
      pointsDeducted: true,
      pointsDeductedAt: new Date(),
      paymentStatus: "simulated",
    },
  );

  return { deducted: cost, alreadyDone: false };
}

/** @deprecated Use reserveSessionPoints — kept for legacy callers during migration */
export async function deductPointsForSession(
  consultationId: number,
  payerUserId: number,
  amountPoints: number,
): Promise<{ paymentRef: string; balanceAfter: number }> {
  await reserveSessionPoints(consultationId, payerUserId, amountPoints);
  const live = await deductPointsOnSessionLive(consultationId);
  const balance = await getUserPointsBalance(payerUserId);
  const row = await ConsultationModel.findOne({ id: consultationId }).lean();
  return {
    paymentRef: row?.paymentRef ?? `mentor_pts_${Date.now()}`,
    balanceAfter: balance,
  };
}

export async function getUserPointsBalance(userId: number): Promise<number> {
  const user = await UserModel.findOne({ id: userId }).lean();
  return user?.totalPoints ?? 0;
}

export async function creditMentorForSession(
  consultationId: number,
  mentorId: number,
  amountPoints: number,
): Promise<number> {
  const cost = sessionPointsCost(amountPoints);
  if (cost <= 0) return 0;

  const row = await ConsultationModel.findOne({ id: consultationId }).lean();
  if (!row || row.mentorPointsCredited) return 0;

  const paid =
    row.pointsDeducted === true
    || row.paymentStatus === "simulated"
    || row.paymentStatus === "paid";

  if (!paid) return 0;

  const claimed = await ConsultationModel.findOneAndUpdate(
    { id: consultationId, mentorPointsCredited: { $ne: true } },
    { mentorPointsCredited: true },
    { new: true },
  ).lean();

  if (!claimed) return 0;

  await UserModel.updateOne({ id: mentorId }, { $inc: { totalPoints: cost } });
  return cost;
}

export async function refundSessionPoints(
  consultationId: number,
  requesterId: number,
  amountPoints: number,
): Promise<void> {
  const cost = sessionPointsCost(amountPoints);
  if (cost <= 0) return;

  const row = await ConsultationModel.findOne({ id: consultationId }).lean();
  if (!row || !row.pointsDeducted || row.mentorPointsCredited) return;

  await UserModel.updateOne({ id: requesterId }, { $inc: { totalPoints: cost } });
  await ConsultationModel.updateOne(
    { id: consultationId },
    {
      pointsDeducted: false,
      pointsReserved: false,
      paymentStatus: "refunded",
    },
  );
}

export async function releaseSessionReservation(consultationId: number): Promise<void> {
  await ConsultationModel.updateOne(
    { id: consultationId, pointsDeducted: { $ne: true } },
    {
      pointsReserved: false,
      paymentStatus: "refunded",
    },
  );
}
