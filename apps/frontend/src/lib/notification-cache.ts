import type { QueryClient } from "@tanstack/react-query";
import type { AppNotification, NotificationListResponse } from "@/lib/notification-api";
import { NOTIFICATION_QUERY_KEYS } from "@/lib/notification-api";

export function notificationTargetPath(n: AppNotification): string {
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

export function removeNotificationFromCaches(
  queryClient: QueryClient,
  id: number,
  wasUnread: boolean,
) {
  queryClient.setQueriesData<NotificationListResponse>(
    { queryKey: ["/api/notifications"] },
    (old) => {
      if (!old) return old;
      const hadItem = old.items.some((n) => n.id === id);
      if (!hadItem) return old;
      return {
        ...old,
        items: old.items.filter((n) => n.id !== id),
        total: Math.max(0, old.total - 1),
      };
    },
  );

  if (wasUnread) {
    queryClient.setQueryData<{ count: number }>(
      NOTIFICATION_QUERY_KEYS.unreadCount,
      (old) => ({ count: Math.max(0, (old?.count ?? 1) - 1) }),
    );
  }
}

export function clearUnreadNotificationCaches(queryClient: QueryClient) {
  queryClient.setQueriesData<NotificationListResponse>(
    { queryKey: ["/api/notifications"] },
    (old) => {
      if (!old) return old;
      const unreadIds = new Set(old.items.filter((n) => !n.isRead).map((n) => n.id));
      if (unreadIds.size === 0) return old;
      return {
        ...old,
        items: old.items.filter((n) => n.isRead),
        total: Math.max(0, old.total - unreadIds.size),
      };
    },
  );
  queryClient.setQueryData(NOTIFICATION_QUERY_KEYS.unreadCount, { count: 0 });
}

export function invalidateNotificationCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
}
