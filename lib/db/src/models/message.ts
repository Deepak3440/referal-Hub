import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const messageSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    conversationId: { type: String, required: true, index: true },
    senderId: { type: Number, required: true, index: true },
    content: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

export type MessageDoc = InferSchemaType<typeof messageSchema>;

export const MessageModel: Model<MessageDoc> =
  mongoose.models.Message ?? mongoose.model<MessageDoc>("Message", messageSchema);

export function toMessage(message: MessageDoc) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}
