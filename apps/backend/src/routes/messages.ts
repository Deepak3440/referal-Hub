import { Router, type IRouter } from "express";
import {
  MessageModel,
  UserModel,
  getNextSequence,
  toMessage,
  toUserProfile,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { SendMessageBody } from "@workspace/api-zod";
import { notifyNewMessage } from "../services/notification-triggers";

const router: IRouter = Router();

router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;

  const msgs = await MessageModel.find({
    $or: [
      { conversationId: { $regex: `^${user.id}_` } },
      { conversationId: { $regex: `_${user.id}$` } },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const seenConvIds = new Set<string>();
  const conversations: Record<string, unknown>[] = [];

  for (const msg of msgs) {
    if (seenConvIds.has(msg.conversationId)) continue;
    seenConvIds.add(msg.conversationId);

    const parts = msg.conversationId.split("_").map(Number);
    const otherUserId = parts[0] === user.id ? parts[1] : parts[0];
    const otherUser = await UserModel.findOne({ id: otherUserId }).lean();

    conversations.push({
      id: msg.conversationId,
      otherUser: toUserProfile(otherUser),
      lastMessage: msg.content,
      lastMessageAt: msg.createdAt.toISOString(),
      unreadCount: 0,
      referralId: null,
    });
  }

  res.json(conversations);
});

router.get("/messages/:conversationId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const raw = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;

  const parts = raw.split("_").map(Number);
  if (!parts.includes(user.id)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const msgs = await MessageModel.find({ conversationId: raw }).sort({ createdAt: 1 }).lean();

  const enriched = await Promise.all(
    msgs.map(async (m) => {
      const sender = await UserModel.findOne({ id: m.senderId }).lean();
      return { ...toMessage(m), sender: toUserProfile(sender) };
    }),
  );

  res.json(enriched);
});

router.post("/messages/:conversationId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).currentUser;
  const raw = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;

  const parts = raw.split("_").map(Number);
  if (!parts.includes(user.id)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const id = await getNextSequence("message");
  const msg = await MessageModel.create({
    id,
    conversationId: raw,
    senderId: user.id,
    content: parsed.data.content,
  });

  const sender = await UserModel.findOne({ id: msg.senderId }).lean();

  const otherUserId = parts[0] === user.id ? parts[1] : parts[0];
  const isReferralIntro = parsed.data.content.startsWith("📩");
  if (otherUserId && otherUserId !== user.id && !isReferralIntro) {
    void notifyNewMessage({
      recipientId: otherUserId,
      senderName: user.fullName,
      conversationId: raw,
      preview: parsed.data.content,
    });
  }

  res.status(201).json({ ...toMessage(msg.toObject()), sender: toUserProfile(sender) });
});

export default router;
