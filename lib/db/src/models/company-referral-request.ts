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
    status: { type: String, enum: ["pending", "closed"], default: "pending" },
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
    status: doc.status ?? "pending",
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
