import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { CheckCheck, Trash2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationApi, NOTIFICATION_QUERY_KEYS } from "@/lib/notification-api";
import { useNotificationActions } from "@/hooks/use-notification-actions";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const { openNotification, markAllRead, dismissNotification } = useNotificationActions();

  const { data, isLoading } = useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.list(page, true),
    queryFn: () => notificationApi.list(page, 15, true),
    refetchInterval: 30_000,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast({ title: "All notifications marked as read" }),
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} unread` : "Loading..."}
        </p>
        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : items.length ? (
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "p-4 flex gap-3 hover:bg-muted/30 transition-colors",
                  !item.isRead && "bg-primary/[0.04]",
                )}
              >
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left"
                  onClick={() => openNotification(item)}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{item.title}</p>
                    {!item.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => dismissNotification.mutate(item.id)}
                  disabled={dismissNotification.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-16 px-6">
            <div className="h-14 w-14 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
              <Inbox className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="font-medium">You&apos;re all caught up</p>
            <p className="text-sm text-muted-foreground mt-1">
              Referrals, messages, and mentorship updates will appear here.
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-3 border-t bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span className="text-xs text-muted-foreground self-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
