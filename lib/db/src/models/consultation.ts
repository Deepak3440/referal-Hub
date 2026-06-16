import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const consultationSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    requesterId: { type: Number, required: true, index: true },
    consultantId: { type: Number, required: true, index: true },
    message: { type: String, default: null },
    status: {
      type: String,
      required: true,
      default: "pending",
      enum: ["pending", "scheduled", "rejected", "completed", "cancelled"],
    },
    scheduledAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 30 },
    meetingLink: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  },
);

export type ConsultationDoc = InferSchemaType<typeof consultationSchema>;

export const ConsultationModel: Model<ConsultationDoc> =
  mongoose.models.Consultation
  ?? mongoose.model<ConsultationDoc>("Consultation", consultationSchema);

export function toConsultation(doc: ConsultationDoc) {
  return {
    id: doc.id,
    requesterId: doc.requesterId,
    consultantId: doc.consultantId,
    message: doc.message ?? null,
    status: doc.status,
    scheduledAt: doc.scheduledAt?.toISOString() ?? null,
    durationMinutes: doc.durationMinutes ?? 30,
    meetingLink: doc.meetingLink ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
