import {
  NotificationModel,
  getNextSequence,
  toNotification,
  type NotificationDoc,
} from "@workspace/db";

export type CreateNotificationData = {
  userId: number;
  type: NotificationDoc["type"];
  title: string;
  message: string;
  referenceId?: number | null;
  referenceType?: NotificationDoc["referenceType"];
  linkPath?: string | null;
};

export const notificationRepository = {
  async create(data: CreateNotificationData) {
    const id = await getNextSequence("notification");
    const doc = await NotificationModel.create({
      id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: false,
      referenceId: data.referenceId ?? null,
      referenceType: data.referenceType ?? null,
      linkPath: data.linkPath ?? null,
    });
    return toNotification(doc.toObject());
  },

  async findByUser(userId: number, page: number, limit: number, unreadOnly = false) {
    const filter = unreadOnly ? { userId, isRead: false } : { userId };
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      NotificationModel.countDocuments(filter),
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);
    return {
      items: items.map(toNotification),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async countUnread(userId: number) {
    return NotificationModel.countDocuments({ userId, isRead: false });
  },

  async findByIdForUser(id: number, userId: number) {
    return NotificationModel.findOne({ id, userId }).lean();
  },

  async markRead(id: number, userId: number) {
    const doc = await NotificationModel.findOneAndUpdate(
      { id, userId },
      { isRead: true },
      { new: true },
    ).lean();
    return doc ? toNotification(doc) : null;
  },

  async markAllRead(userId: number) {
    const result = await NotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true },
    );
    return result.modifiedCount;
  },

  async deleteById(id: number, userId: number) {
    const result = await NotificationModel.deleteOne({ id, userId });
    return result.deletedCount > 0;
  },
};
