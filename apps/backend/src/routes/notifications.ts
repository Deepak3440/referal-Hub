import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { notificationController } from "../controllers/notification.controller";

const router: IRouter = Router();

router.get("/notifications", requireAuth, notificationController.list);
router.get("/notifications/unread-count", requireAuth, notificationController.unreadCount);
router.patch("/notifications/read-all", requireAuth, notificationController.markAllRead);
router.patch("/notifications/:id/read", requireAuth, notificationController.markRead);
router.delete("/notifications/:id", requireAuth, notificationController.remove);

export default router;
