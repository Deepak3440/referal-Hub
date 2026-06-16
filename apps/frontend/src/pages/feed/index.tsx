import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { FeedComposer } from "@/components/feed/feed-composer";
import { FeedPostCard } from "@/components/feed/feed-post-card";
import { FeedSidebar } from "@/components/feed/feed-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { feedApi, FEED_QUERY_KEYS, FEED_PAGE_SIZE, type FeedListResponse } from "@/lib/feed-api";
import { feedRangeLabel } from "@/lib/feed-utils";
import { isAlumniMember } from "@/lib/user-utils";
import { ChevronLeft, ChevronRight, Rss } from "lucide-react";
import { cn } from "@/lib/utils";

function FeedPaginationBar({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <Pagination>
      <PaginationContent className="flex-wrap gap-1">
        <PaginationItem>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 h-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
        </PaginationItem>
        {pages.map((p) => (
          <PaginationItem key={p}>
            <Button
              variant={p === page ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          </PaginationItem>
        ))}
        <PaginationItem>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 h-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default function FeedPage() {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canPost = isAlumniMember(me);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: FEED_QUERY_KEYS.list(page),
    queryFn: () => feedApi.listPosts(page, FEED_PAGE_SIZE),
    placeholderData: (prev) => prev,
    refetchInterval: 20000,
  });

  const posts = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const createMutation = useMutation({
    mutationFn: feedApi.createPost,
    onSuccess: (_data, variables) => {
      toast({
        title: variables.postType === "job" ? "Job shared on feed" : "Posted to feed",
      });
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEYS.contributors });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: feedApi.deletePost,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEYS.list(page) });
      const previous = queryClient.getQueryData<FeedListResponse>(FEED_QUERY_KEYS.list(page));

      queryClient.setQueryData(FEED_QUERY_KEYS.list(page), (old) => {
        if (!old) return old;
        const items = old.items.filter((p) => p.id !== postId);
        const total = Math.max(0, old.total - 1);
        return {
          ...old,
          items,
          total,
          totalPages: Math.max(1, Math.ceil(total / FEED_PAGE_SIZE)),
        };
      });

      return { previous };
    },
    onSuccess: () => {
      toast({ title: "Post deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEYS.contributors });
    },
    onError: (err: Error, _postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FEED_QUERY_KEYS.list(page), context.previous);
      }
      toast({ title: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_272px] gap-4 w-full">
      <div className="min-w-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {me && canPost && (
          <FeedComposer
            user={me}
            embedded
            isPosting={createMutation.isPending}
            onPost={async (payload) => {
              await createMutation.mutateAsync(payload);
            }}
          />
        )}

        <div className="px-3 py-2 border-b flex items-center justify-between gap-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <Rss className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-semibold text-sm">Feed</span>
            {total > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                {total}
              </Badge>
            )}
          </div>
          {total > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {feedRangeLabel(page, FEED_PAGE_SIZE, total)}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-3 space-y-3">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        ) : posts.length > 0 ? (
          <>
            <div className={cn("divide-y divide-border", isFetching && "opacity-60 transition-opacity")}>
              {posts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  page={page}
                  currentUserId={me?.id}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables === post.id}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="px-3 py-3 border-t bg-muted/10 flex justify-center">
                <FeedPaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-3">
              <Rss className="h-6 w-6 text-primary/60" />
            </div>
            <p className="font-medium text-sm">Your feed is empty</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
              {canPost
                ? "Share the first post with your community."
                : "Posts from alumni and mentors will show up here."}
            </p>
          </div>
        )}
      </div>

      <FeedSidebar />
    </div>
  );
}
