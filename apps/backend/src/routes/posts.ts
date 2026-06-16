import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  PostModel,
  PostCommentModel,
  UserModel,
  getNextSequence,
  toPost,
  toPostComment,
  toUserProfile,
  type PostDoc,
  type PostCommentDoc,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { savePostMedia } from "../lib/uploads";
import { notifyPostComment, notifyPostLike } from "../services/notification-triggers";

const router: IRouter = Router();

const CreatePostBody = z
  .object({
    content: z.string().min(1, "Write something to post").max(5000),
    imageUrl: z.string().min(1).optional().nullable(),
    videoUrl: z.string().min(1).optional().nullable(),
    linkUrl: z.string().min(1).optional().nullable(),
    linkLabel: z.string().max(120).optional().nullable(),
    postType: z.enum(["update", "job"]).optional().default("update"),
  })
  .superRefine((data, ctx) => {
    if (data.postType === "job" && !data.linkUrl?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Job link is required for job posts",
        path: ["linkUrl"],
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

const UploadMediaBody = z.object({
  data: z.string().min(1),
  mimeType: z.string().min(1),
});

const CreateCommentBody = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(1000),
});

function isAlumni(user: { memberType?: string }) {
  return user.memberType === "alumni";
}

async function enrichComment(doc: PostCommentDoc) {
  const author = await UserModel.findOne({ id: doc.authorId }).lean();
  return {
    ...toPostComment(doc),
    author: toUserProfile(author),
  };
}

async function enrichPost(doc: PostDoc, currentUserId?: number, includeComments = true) {
  const author = await UserModel.findOne({ id: doc.authorId }).lean();
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
    author: toUserProfile(author),
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

  const items = await Promise.all(
    grouped.map(async ({ _id, postCount }) => {
      const author = await UserModel.findOne({ id: _id }).lean();
      return {
        authorId: _id,
        postCount,
        author: toUserProfile(author),
      };
    }),
  );

  res.json({ items: items.filter((item) => item.author) });
});

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const user = (req as { currentUser: { id: number } }).currentUser;
  const pageRaw = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
  const limitRaw = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 10;
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
  const limit = Number.isNaN(limitRaw) ? 10 : Math.min(Math.max(limitRaw, 1), 20);
  const skip = (page - 1) * limit;

  const [total, posts] = await Promise.all([
    PostModel.countDocuments(),
    PostModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  const enriched = await Promise.all(posts.map((p) => enrichPost(p, user.id)));
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
  const user = (req as { currentUser: { id: number; memberType?: string } }).currentUser;

  if (!isAlumni(user)) {
    res.status(403).json({ error: "Only alumni can create posts." });
    return;
  }

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
    content: content.trim(),
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
  const user = (req as { currentUser: { memberType?: string } }).currentUser;

  if (!isAlumni(user)) {
    res.status(403).json({ error: "Only alumni can upload media." });
    return;
  }

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
