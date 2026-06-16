import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const postCommentSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    postId: { type: Number, required: true, index: true },
    authorId: { type: Number, required: true, index: true },
    content: { type: String, required: true, maxlength: 1000 },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    versionKey: false,
  },
);

export type PostCommentDoc = InferSchemaType<typeof postCommentSchema>;
export type PostComment = PostCommentDoc & { _id: mongoose.Types.ObjectId };

export const PostCommentModel: Model<PostCommentDoc> =
  mongoose.models.PostComment ??
  mongoose.model<PostCommentDoc>("PostComment", postCommentSchema);

export function toPostComment(doc: PostCommentDoc) {
  return {
    id: doc.id,
    postId: doc.postId,
    authorId: doc.authorId,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
