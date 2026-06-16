import {
  ConsultationModel,
  JobModel,
  MessageModel,
  NotificationModel,
  PostCommentModel,
  PostModel,
  ReferralModel,
  SavedJobModel,
  UserModel,
} from "@workspace/db";

export async function deleteUserAccount(userId: number): Promise<void> {
  const userJobs = await JobModel.find({ posterId: userId }).select("id").lean();
  const jobIds = userJobs.map((j) => j.id);

  const userPosts = await PostModel.find({ authorId: userId }).select("id").lean();
  const postIds = userPosts.map((p) => p.id);

  await Promise.all([
    NotificationModel.deleteMany({ userId }),
    MessageModel.deleteMany({
      $or: [
        { conversationId: { $regex: `^${userId}_` } },
        { conversationId: { $regex: `_${userId}$` } },
      ],
    }),
    ConsultationModel.deleteMany({
      $or: [{ requesterId: userId }, { consultantId: userId }],
    }),
    ReferralModel.deleteMany({
      $or: [
        { requesterId: userId },
        { referrerId: userId },
        ...(jobIds.length > 0 ? [{ jobId: { $in: jobIds } }] : []),
      ],
    }),
    SavedJobModel.deleteMany({ userId }),
    PostCommentModel.deleteMany({
      $or: [
        { authorId: userId },
        ...(postIds.length > 0 ? [{ postId: { $in: postIds } }] : []),
      ],
    }),
    PostModel.deleteMany({ authorId: userId }),
    JobModel.deleteMany({ posterId: userId }),
  ]);

  const deleted = await UserModel.deleteOne({ id: userId });
  if (deleted.deletedCount === 0) {
    throw new Error("User not found");
  }
}
