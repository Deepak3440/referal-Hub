import { httpRequest } from "@/lib/http-client";

export type NotificationType =
  | "referral_requested"
  | "referral_accepted"
  | "referral_rejected"
  | "referral_status_changed"
  | "new_message"
  | "mentorship_booking"
  | "mentorship_scheduled"
  | "mentorship_rejected"
  | "post_comment"
  | "post_like";

export type NotificationReferenceType =
  | "referral"
  | "message"
  | "consultation"
  | "post"
  | "post_comment"
  | "conversation";

export type AppNotification = {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  referenceId: number | null;
  referenceType: NotificationReferenceType | null;
  linkPath: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type NotificationListResponse = {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const notificationApi = {
  list: (page = 1, limit = 20, unreadOnly = false) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (unreadOnly) params.set("unreadOnly", "true");
    return httpRequest<NotificationListResponse>(`/notifications?${params.toString()}`);
  },
  unreadCount: () => httpRequest<{ count: number }>("/notifications/unread-count"),
  markRead: (id: number) =>
    httpRequest<AppNotification>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () =>
    httpRequest<{ updated: number }>("/notifications/read-all", { method: "PATCH" }),
  delete: (id: number) =>
    httpRequest<void>(`/notifications/${id}`, { method: "DELETE" }),
};

export const NOTIFICATION_QUERY_KEYS = {
  list: (page: number, unreadOnly = false) =>
    ["/api/notifications", { page, unreadOnly }] as const,
  unreadCount: ["/api/notifications/unread-count"] as const,
};

/** @deprecated use notificationTargetPath from notification-cache.ts */
export function notificationLink(n: AppNotification): string {
  if (n.linkPath) return n.linkPath;
  switch (n.referenceType) {
    case "referral":
      return "/referrals";
    case "consultation":
      return "/consult?tab=sessions";
    case "post":
    case "post_comment":
      return "/feed";
    case "conversation":
      return "/messages";
    default:
      return "/home";
  }
}
