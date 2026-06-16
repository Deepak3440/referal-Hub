import { useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/lib/notification-api";
import type { AppNotification } from "@/lib/notification-api";
import {
  clearUnreadNotificationCaches,
  invalidateNotificationCaches,
  notificationTargetPath,
  removeNotificationFromCaches,
} from "@/lib/notification-cache";

export function useNotificationActions(onAfterNavigate?: () => void) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const openNotification = useCallback(
    async (item: AppNotification) => {
      const path = notificationTargetPath(item);
      const wasUnread = !item.isRead;

      if (wasUnread) {
        removeNotificationFromCaches(queryClient, item.id, true);
        try {
          await notificationApi.markRead(item.id);
        } catch {
          invalidateNotificationCaches(queryClient);
        }
      }

      setLocation(path);
      onAfterNavigate?.();
    },
    [queryClient, setLocation, onAfterNavigate],
  );

  const markAllRead = useMutation({
    mutationFn: notificationApi.markAllRead,
    onMutate: () => {
      clearUnreadNotificationCaches(queryClient);
    },
    onError: () => {
      invalidateNotificationCaches(queryClient);
    },
  });

  const dismissNotification = useMutation({
    mutationFn: notificationApi.delete,
    onMutate: (id) => {
      const lists = queryClient.getQueriesData<{ items: AppNotification[] }>({
        queryKey: ["/api/notifications"],
      });
      let wasUnread = false;
      for (const [, data] of lists) {
        const found = data?.items.find((n) => n.id === id);
        if (found && !found.isRead) wasUnread = true;
      }
      removeNotificationFromCaches(queryClient, id, wasUnread);
    },
    onError: () => {
      invalidateNotificationCaches(queryClient);
    },
  });

  return { openNotification, markAllRead, dismissNotification };
}
