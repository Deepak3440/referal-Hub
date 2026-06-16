import { z } from "zod";
import { notificationRepository, type CreateNotificationData } from "../repositories/notification.repository";
import { logger } from "../lib/logger";

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export async function createNotification(data: CreateNotificationData) {
  try {
    return await notificationRepository.create(data);
  } catch (err) {
    logger.error({ err, data }, "Failed to create notification");
    return null;
  }
}

export const notificationService = {
  listForUser(userId: number, query: unknown) {
    const parsed = ListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    return notificationRepository.findByUser(
      userId,
      parsed.data.page,
      parsed.data.limit,
      parsed.data.unreadOnly ?? false,
    );
  },

  getUnreadCount(userId: number) {
    return notificationRepository.countUnread(userId);
  },

  async markRead(id: number, userId: number) {
    const updated = await notificationRepository.markRead(id, userId);
    if (!updated) throw new Error("Notification not found");
    return updated;
  },

  markAllRead(userId: number) {
    return notificationRepository.markAllRead(userId);
  },

  async deleteNotification(id: number, userId: number) {
    const deleted = await notificationRepository.deleteById(id, userId);
    if (!deleted) throw new Error("Notification not found");
  },
};

export { createNotification as notify };
