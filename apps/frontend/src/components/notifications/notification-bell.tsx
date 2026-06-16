import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  notificationApi,
  NOTIFICATION_QUERY_KEYS,
  type AppNotification,
} from "@/lib/notification-api";
import { useNotificationActions } from "@/hooks/use-notification-actions";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function NotificationItem({
  item,
  onOpen,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/60 last:border-0",
        !item.isRead && "bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{item.title}</p>
        {!item.isRead && (
          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.message}</p>
      <p className="text-[10px] text-muted-foreground mt-1">
        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
      </p>
    </button>
  );
}

export function NotificationBell() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const onNotificationsPage = location === "/notifications";
  const { openNotification, markAllRead } = useNotificationActions(() => setOpen(false));

  const { data: unread } = useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.unreadCount,
    queryFn: notificationApi.unreadCount,
    refetchInterval: 30_000,
    enabled: !onNotificationsPage,
  });

  const { data, isLoading } = useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.list(1, true),
    queryFn: () => notificationApi.list(1, 8, true),
    refetchInterval: 30_000,
    enabled: !onNotificationsPage && open,
  });

  const count = unread?.count ?? 0;

  const bellButton = (
    <Button
      variant={onNotificationsPage ? "default" : "outline"}
      size="icon"
      className="h-9 w-9 relative shrink-0"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {count > 0 && !onNotificationsPage && (
        <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 text-[10px] font-bold pointer-events-none">
          {count > 9 ? "9+" : count}
        </Badge>
      )}
    </Button>
  );

  if (onNotificationsPage) {
    return bellButton;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {bellButton}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 z-[100] shadow-lg"
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/30">
          <p className="text-sm font-semibold">Notifications</p>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[min(360px,50vh)] overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : data?.items.length ? (
            data.items.map((item) => (
              <NotificationItem
                key={item.id}
                item={item}
                onOpen={openNotification}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10 px-4">
              You&apos;re all caught up
            </p>
          )}
        </div>
        <div className="border-t p-2 bg-muted/20">
          <Button variant="ghost" size="sm" className="w-full h-8 text-xs font-medium" asChild>
            <Link href="/notifications">See all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
