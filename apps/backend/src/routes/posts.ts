import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  PostModel,
  PostCommentModel,
  UserModel,
  getNextSequence,
  toPost,
  toPostComment,
  publiclyVisibleUserFilter,
  type PostDoc,
  type PostCommentDoc,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { findPublicUserById, toPublicUserProfile } from "../lib/public-user";
import { notifyPostComment, notifyPostLike } from "../services/notification-triggers";
import { savePostMedia } from "../lib/uploads";

const router: IRouter = Router();

const postContentSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().max(5000));

const PostBodySchema = z
  .object({
    content: postContentSchema,
    imageUrl: z.string().min(1).optional().nullable(),
    videoUrl: z.string().min(1).optional().nullable(),
    linkUrl: z.string().min(1).optional().nullable(),
    linkLabel: z.string().max(120).optional().nullable(),
    postType: z.enum(["update", "job"]).optional().default("update"),
  })
  .superRefine((data, ctx) => {
    const hasText = Boolean(data.content);
    const hasMedia = Boolean(data.imageUrl?.trim()) || Boolean(data.videoUrl?.trim());

    if (data.postType === "job") {
      if (!hasText) {
        ctx.addIssue({
          code: "custom",
          message: "Write something to post",
          path: ["content"],
        });
      }
      if (!data.linkUrl?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Job link is required for job posts",
          path: ["linkUrl"],
        });
      }
    } else if (!hasText && !hasMedia) {
      ctx.addIssue({
        code: "custom",
        message: "Write something or add a photo",
        path: ["content"],
      });
    }
    if (data.linkUrl?.trim()) {
      try {
        new URL(data.linkUrl.trim());
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid job link (https://...)",
          path: ["linkUrl"],
        });
      }
    }
  });

const CreatePostBody = PostBodySchema;
const UpdatePostBody = PostBodySchema;

const UploadMediaBody = z.object({
  data: z.string().min(1),
  mimeType: z.string().min(1),
});

const CreateCommentBody = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(1000),
});

async function enrichComment(doc: PostCommentDoc) {
  const author = await findPublicUserById(doc.authorId);
  return {
    ...toPostComment(doc),
    author: toPublicUserProfile(author),
  };
}

async function enrichPost(doc: PostDoc, currentUserId?: number, includeComments = true) {
  const author = await findPublicUserById(doc.authorId);
  if (!author) return null;

  const likedBy = doc.likedByUserIds ?? [];

  let comments: Awaited<ReturnType<typeof enrichComment>>[] = [];
  let commentCount = 0;

  if (includeComments) {
    commentCount = await PostCommentModel.countDocuments({ postId: doc.id });
    const recent = await PostCommentModel.find({ postId: doc.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    comments = await Promise.all(recent.reverse().map((c) => enrichComment(c)));
  }

  return {
    ...toPost(doc),
    likedByMe: currentUserId ? likedBy.includes(currentUserId) : false,
    commentCount,
    comments,
    author: toPublicUserProfile(author),
  };
}

router.get("/posts/contributors", requireAuth, async (req, res): Promise<void> => {
  const limitRaw = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 5;
  const limit = Number.isNaN(limitRaw) ? 5 : Math.min(Math.max(limitRaw, 1), 10);

  const grouped = await PostModel.aggregate<{ _id: number; postCount: number }>([
    { $group: { _id: "$authorId", postCount: { $sum: 1 } } },
    { $sort: { postCount: -1 } },
    { $limit: limit },
  ]);

  const items = (
    await Promise.all(
      grouped.map(async ({ _id, postCount }) => {
        const author = await findPublicUserById(_id);
        if (!author) return null;
        return {
          authorId: _id,
          postCount,
          author: toPublicUserProfile(author),
        };
      }),
    )
  ).filter((item) => item !== null);

  res.json({ items });
});

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const pageRaw = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
  const limitRaw = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 10;
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
  const limit = Number.isNaN(limitRaw) ? 10 : Math.min(Math.max(limitRaw, 1), 20);
  const skip = (page - 1) * limit;

  const verifiedAuthors = await UserModel.find(publiclyVisibleUserFilter).select("id").lean();
  const verifiedAuthorIds = verifiedAuthors.map((u) => u.id);
  const postFilter =
    verifiedAuthorIds.length > 0 ? { authorId: { $in: verifiedAuthorIds } } : { authorId: -1 };

  const [total, posts] = await Promise.all([
    PostModel.countDocuments(postFilter),
    PostModel.find(postFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  const enriched = (
    await Promise.all(posts.map((p) => enrichPost(p, user.id)))
  ).filter((p) => p !== null);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    items: enriched,
    total,
    page,
    limit,
    totalPages,
  });
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;

  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { content, imageUrl, videoUrl, linkUrl, linkLabel, postType } = parsed.data;
  const id = await getNextSequence("post");
  const post = await PostModel.create({
    id,
    authorId: user.id,
    content: content ?? "",
    imageUrl: imageUrl ?? null,
    videoUrl: videoUrl ?? null,
    linkUrl: linkUrl?.trim() ?? null,
    linkLabel: linkLabel?.trim() ?? null,
    postType: postType ?? "update",
    likedByUserIds: [],
  });

  res.status(201).json(await enrichPost(post.toObject(), user.id));
});

router.post("/posts/media", requireAuth, async (req, res): Promise<void> => {
  const parsed = UploadMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid upload" });
    return;
  }

  try {
    const saved = savePostMedia(parsed.data.data, parsed.data.mimeType);
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
  }
});

router.post("/posts/:id/like", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const postId = parseInt(String(req.params.id), 10);

  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const post = await PostModel.findOne({ id: postId });
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const likedBy = post.likedByUserIds ?? [];
  const alreadyLiked = likedBy.includes(user.id);
  post.likedByUserIds = alreadyLiked
    ? likedBy.filter((id) => id !== user.id)
    : [...likedBy, user.id];
  await post.save();

  if (!alreadyLiked && post.authorId !== user.id) {
    void notifyPostLike({
      authorId: post.authorId,
      likerName: user.fullName,
      postId: post.id,
    });
  }

  res.json(await enrichPost(post.toObject(), user.id));
});

router.post("/posts/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const postId = parseInt(String(req.params.id), 10);

  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const post = await PostModel.findOne({ id: postId }).lean();
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid comment" });
    return;
  }

  const commentId = await getNextSequence("postComment");
  const comment = await PostCommentModel.create({
    id: commentId,
    postId,
    authorId: user.id,
    content: parsed.data.content.trim(),
  });

  if (post.authorId !== user.id) {
    void notifyPostComment({
      authorId: post.authorId,
      commenterName: user.fullName,
      postId,
      commentId,
      preview: parsed.data.content.trim(),
    });
  }

  const enrichedPost = await enrichPost(post, user.id);
  const enrichedComment = await enrichComment(comment.toObject());

  res.status(201).json({ comment: enrichedComment, post: enrichedPost });
});

router.put("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const postId = parseInt(String(req.params.id), 10);

  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const existing = await PostModel.findOne({ id: postId });
  if (!existing) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (existing.authorId !== user.id) {
    res.status(403).json({ error: "You can only edit your own posts." });
    return;
  }

  const parsed = UpdatePostBody.safeParse({
    ...req.body,
    postType: req.body?.postType ?? existing.postType ?? "update",
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { content, imageUrl, videoUrl, linkUrl, linkLabel, postType } = parsed.data;

  existing.content = content ?? "";
  existing.imageUrl = imageUrl ?? null;
  existing.videoUrl = videoUrl ?? null;
  existing.linkUrl = linkUrl?.trim() ?? null;
  existing.linkLabel = linkLabel?.trim() ?? null;
  existing.postType = postType ?? "update";
  await existing.save();

  res.json(await enrichPost(existing.toObject(), user.id));
});

router.delete("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number; memberType?: string } }).currentUser;
  const postId = parseInt(String(req.params.id), 10);

  if (Number.isNaN(postId)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const post = await PostModel.findOne({ id: postId }).lean();
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (post.authorId !== user.id) {
    res.status(403).json({ error: "You can only delete your own posts." });
    return;
  }

  await Promise.all([
    PostModel.deleteOne({ id: postId }),
    PostCommentModel.deleteMany({ postId }),
  ]);
  res.status(204).send();
});

export default router;
