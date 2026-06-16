import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const referralSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    jobId: { type: Number, required: true, index: true },
    requesterId: { type: Number, required: true, index: true },
    referrerId: { type: Number, required: true, index: true },
    status: { type: String, required: true, default: "pending" },
    interviewStatus: { type: String, default: null },
    note: { type: String, default: null },
    rewardTransferred: { type: Boolean, required: true, default: false },
    rewardStagesApplied: { type: [String], default: [] },
    /** Snapshot of job.rewardPoints when request was sent (% deductions use this) */
    rewardPoints: { type: Number, default: null },
    totalPointsDeducted: { type: Number, required: true, default: 0 },
    totalPointsCredited: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  },
);

export type ReferralDoc = InferSchemaType<typeof referralSchema>;

export const ReferralModel: Model<ReferralDoc> =
  mongoose.models.Referral ?? mongoose.model<ReferralDoc>("Referral", referralSchema);

referralSchema.index({ jobId: 1, requesterId: 1 }, { unique: true });

export function toReferral(referral: ReferralDoc) {
  return {
    id: referral.id,
    jobId: referral.jobId,
    requesterId: referral.requesterId,
    referrerId: referral.referrerId,
    status: referral.status,
    interviewStatus: referral.interviewStatus,
    note: referral.note,
    rewardTransferred: referral.rewardTransferred,
    rewardStagesApplied: referral.rewardStagesApplied ?? [],
    rewardPoints: referral.rewardPoints ?? null,
    totalPointsDeducted: referral.totalPointsDeducted ?? 0,
    totalPointsCredited: referral.totalPointsCredited ?? 0,
    createdAt: referral.createdAt.toISOString(),
    updatedAt: referral.updatedAt?.toISOString(),
  };
}
