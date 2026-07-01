import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const participantSchema = new Schema(
  {
    userId: { type: Number, required: true },
    role: { type: String, required: true, enum: ["consultant", "customer"] },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null },
  },
  { _id: false },
);

const consultationSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    requesterId: { type: Number, required: true, index: true },
    consultantId: { type: Number, required: true, index: true },
    message: { type: String, default: null },
    status: {
      type: String,
      required: true,
      default: "pending_payment",
      enum: [
        "pending",
        "pending_payment",
        "scheduled",
        "waiting_for_participants",
        "started",
        "completed",
        "cancelled",
        "rejected",
      ],
    },
    scheduledAt: { type: Date, default: null, index: true },
    scheduledEndAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 30 },
    amountInr: { type: Number, default: 0 },
    /** Session fee in platform points (reserved on confirm, deducted when live, credited to mentor on complete). */
    amountPoints: { type: Number, default: 0 },
    pointsReserved: { type: Boolean, default: false },
    pointsDeducted: { type: Boolean, default: false },
    pointsDeductedAt: { type: Date, default: null },
    mentorPointsCredited: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      default: "not_required",
      enum: ["not_required", "pending", "authorized", "simulated", "paid", "refunded"],
    },
    paymentRef: { type: String, default: null },
    videoProvider: { type: String, default: "jitsi" },
    roomName: { type: String, default: null },
    roomId: { type: String, default: null },
    meetingLink: { type: String, default: null },
    sessionStatus: {
      type: String,
      default: "scheduled",
      enum: ["scheduled", "started", "completed", "cancelled", "expired"],
    },
    meetingStatus: {
      type: String,
      default: "scheduled",
      enum: ["scheduled", "waiting_for_participants", "started", "ended", "completed", "cancelled"],
    },
    actualStartAt: { type: Date, default: null },
    actualEndAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null },
    participants: { type: [participantSchema], default: [] },
    disputeStatus: {
      type: String,
      default: "none",
      enum: ["none", "open", "resolved_refund", "resolved_mentor", "resolved_dismissed"],
    },
    disputeReason: { type: String, default: null },
    disputeRaisedAt: { type: Date, default: null },
    disputeResolvedAt: { type: Date, default: null },
    disputeAdminNote: { type: String, default: null },
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
    scheduledEndAt: doc.scheduledEndAt?.toISOString() ?? null,
    durationMinutes: doc.durationMinutes ?? 30,
    amountInr: doc.amountInr ?? 0,
    amountPoints: doc.amountPoints ?? 0,
    pointsReserved: doc.pointsReserved ?? false,
    pointsDeducted: doc.pointsDeducted ?? false,
    pointsDeductedAt: doc.pointsDeductedAt?.toISOString() ?? null,
    mentorPointsCredited: doc.mentorPointsCredited ?? false,
    paymentStatus: doc.paymentStatus ?? "not_required",
    paymentRef: doc.paymentRef ?? null,
    videoProvider: doc.videoProvider ?? "jitsi",
    roomName: doc.roomName ?? doc.roomId ?? null,
    roomId: doc.roomId ?? doc.roomName ?? null,
    meetingLink: doc.meetingLink ?? null,
    sessionStatus: doc.sessionStatus ?? "scheduled",
    meetingStatus: doc.meetingStatus ?? "scheduled",
    actualStartAt: doc.actualStartAt?.toISOString() ?? null,
    actualEndAt: doc.actualEndAt?.toISOString() ?? null,
    durationSeconds: doc.durationSeconds ?? null,
    participants: (doc.participants ?? []).map((p) => ({
      userId: p.userId,
      role: p.role,
      joinedAt: p.joinedAt?.toISOString() ?? null,
      leftAt: p.leftAt?.toISOString() ?? null,
      durationSeconds: p.durationSeconds ?? null,
    })),
    disputeStatus: doc.disputeStatus ?? "none",
    disputeReason: doc.disputeReason ?? null,
    disputeRaisedAt: doc.disputeRaisedAt?.toISOString() ?? null,
    disputeResolvedAt: doc.disputeResolvedAt?.toISOString() ?? null,
    disputeAdminNote: doc.disputeAdminNote ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
