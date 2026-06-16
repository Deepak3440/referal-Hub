import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service";

function getUserId(req: Request): number {
  return (req as { currentUser: { id: number } }).currentUser.id;
}

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : "Request failed";
  if (message === "Notification not found") {
    res.status(404).json({ error: message });
    return;
  }
  res.status(400).json({ error: message });
}

export const notificationController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const data = await notificationService.listForUser(getUserId(req), req.query);
      res.json(data);
    } catch (err) {
      handleError(res, err);
    }
  },

  async unreadCount(req: Request, res: Response): Promise<void> {
    const count = await notificationService.getUnreadCount(getUserId(req));
    res.json({ count });
  },

  async markRead(req: Request, res: Response): Promise<void> {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid notification id" });
      return;
    }
    try {
      const updated = await notificationService.markRead(id, getUserId(req));
      res.json(updated);
    } catch (err) {
      handleError(res, err);
    }
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    const updated = await notificationService.markAllRead(getUserId(req));
    res.json({ updated });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid notification id" });
      return;
    }
    try {
      await notificationService.deleteNotification(id, getUserId(req));
      res.status(204).send();
    } catch (err) {
      handleError(res, err);
    }
  },
};
