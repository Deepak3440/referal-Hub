import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const postSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    authorId: { type: Number, required: true, index: true },
    content: { type: String, required: true, maxlength: 5000 },
    imageUrl: { type: String, default: null },
    videoUrl: { type: String, default: null },
    linkUrl: { type: String, default: null },
    linkLabel: { type: String, default: null },
    postType: { type: String, enum: ["update", "job"], default: "update" },
    likedByUserIds: { type: [Number], default: [] },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  },
);

export type PostDoc = InferSchemaType<typeof postSchema>;
export type Post = PostDoc & { _id: mongoose.Types.ObjectId };

export const PostModel: Model<PostDoc> =
  mongoose.models.Post ?? mongoose.model<PostDoc>("Post", postSchema);

export function toPost(doc: PostDoc) {
  return {
    id: doc.id,
    authorId: doc.authorId,
    content: doc.content,
    imageUrl: doc.imageUrl ?? null,
    videoUrl: doc.videoUrl ?? null,
    linkUrl: doc.linkUrl ?? null,
    linkLabel: doc.linkLabel ?? null,
    postType: doc.postType ?? "update",
    likeCount: doc.likedByUserIds?.length ?? 0,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
