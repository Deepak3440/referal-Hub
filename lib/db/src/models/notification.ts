import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const NOTIFICATION_TYPES = [
  "referral_requested",
  "referral_accepted",
  "referral_rejected",
  "referral_status_changed",
  "new_message",
  "mentorship_booking",
  "mentorship_scheduled",
  "mentorship_rejected",
  "post_comment",
  "post_like",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_REFERENCE_TYPES = [
  "referral",
  "message",
  "consultation",
  "post",
  "post_comment",
  "conversation",
] as const;

export type NotificationReferenceType = (typeof NOTIFICATION_REFERENCE_TYPES)[number];

const notificationSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    userId: { type: Number, required: true, index: true },
    type: { type: String, required: true, enum: NOTIFICATION_TYPES, index: true },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },
    isRead: { type: Boolean, required: true, default: false, index: true },
    referenceId: { type: Number, default: null },
    referenceType: {
      type: String,
      enum: NOTIFICATION_REFERENCE_TYPES,
      default: null,
    },
    linkPath: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;
export type Notification = NotificationDoc & { _id: mongoose.Types.ObjectId };

export const NotificationModel: Model<NotificationDoc> =
  mongoose.models.Notification ??
  mongoose.model<NotificationDoc>("Notification", notificationSchema);

export function toNotification(doc: NotificationDoc) {
  return {
    id: doc.id,
    userId: doc.userId,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    isRead: doc.isRead,
    referenceId: doc.referenceId ?? null,
    referenceType: doc.referenceType ?? null,
    linkPath: doc.linkPath ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
