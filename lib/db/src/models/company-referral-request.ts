import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const companyReferralRequestSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    requesterId: { type: Number, required: true, index: true },
    company: { type: String, required: true },
    companyKey: { type: String, required: true, index: true },
    roleTitle: { type: String, required: true },
    jobUrl: { type: String, required: true },
    note: { type: String, required: true },
    resumeUrl: { type: String, default: null },
    referrerIds: { type: [Number], default: [] },
    acceptedByReferrerId: { type: Number, default: null },
    rejectedReferrerIds: { type: [Number], default: [] },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "referred",
        "interviewing",
        "hired",
        "rejected_after_interview",
        "declined",
        "closed",
      ],
      default: "pending",
    },
    rewardPoints: { type: Number, default: null },
    rewardStagesApplied: { type: [String], default: [] },
    totalPointsDeducted: { type: Number, default: 0 },
    totalPointsCredited: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  },
);

companyReferralRequestSchema.index({ requesterId: 1, companyKey: 1 }, { unique: true });

export type CompanyReferralRequestDoc = InferSchemaType<typeof companyReferralRequestSchema>;

export const CompanyReferralRequestModel: Model<CompanyReferralRequestDoc> =
  mongoose.models.CompanyReferralRequest ??
  mongoose.model<CompanyReferralRequestDoc>("CompanyReferralRequest", companyReferralRequestSchema);

export function toCompanyReferralRequest(doc: CompanyReferralRequestDoc) {
  return {
    id: doc.id,
    requesterId: doc.requesterId,
    company: doc.company,
    companyKey: doc.companyKey,
    roleTitle: doc.roleTitle,
    jobUrl: doc.jobUrl,
    note: doc.note,
    resumeUrl: doc.resumeUrl ?? null,
    referrerIds: doc.referrerIds ?? [],
    acceptedByReferrerId: doc.acceptedByReferrerId ?? null,
    rejectedReferrerIds: doc.rejectedReferrerIds ?? [],
    status: doc.status ?? "pending",
    rewardPoints: doc.rewardPoints ?? null,
    rewardStagesApplied: doc.rewardStagesApplied ?? [],
    totalPointsDeducted: doc.totalPointsDeducted ?? 0,
    totalPointsCredited: doc.totalPointsCredited ?? 0,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
