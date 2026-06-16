import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FeedPost } from "@/lib/feed-api";
import { feedApi, FEED_QUERY_KEYS } from "@/lib/feed-api";
import { getYoutubeEmbedUrl } from "@/lib/feed-utils";
import { memberTypeLabel } from "@/lib/user-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
  Video,
  Briefcase,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FeedLinkPreview, FeedPostImage } from "@/components/feed/feed-media";

type Props = {
  post: FeedPost;
  currentUserId?: number;
  page: number;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
};

export function FeedPostCard({ post, currentUserId, page, onDelete, isDeleting }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const author = post.author;
  const youtubeEmbed = post.videoUrl ? getYoutubeEmbedUrl(post.videoUrl) : null;
  const isVideoFile = post.videoUrl?.includes("/api/uploads/");
  const isOwnPost = post.authorId === currentUserId;
  const subtitle = [author?.currentRole, author?.company].filter(Boolean).join(" · ");

  const likeMutation = useMutation({
    mutationFn: () => feedApi.toggleLike(post.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(FEED_QUERY_KEYS.list(page), (old: { items: FeedPost[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((p) => (p.id === updated.id ? updated : p)),
        };
      });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => feedApi.addComment(post.id, content),
    onSuccess: ({ post: updated }) => {
      queryClient.setQueryData(FEED_QUERY_KEYS.list(page), (old: { items: FeedPost[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((p) => (p.id === updated.id ? updated : p)),
        };
      });
      setCommentText("");
      setShowComments(true);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    commentMutation.mutate(text);
  };

  return (
    <article className="bg-card hover:bg-muted/10 transition-colors">
      <div className="p-3 sm:px-4">
        <div className="flex items-start gap-3">
          <Link href={author ? `/profile/${author.id}` : "/profile"}>
            <Avatar className="h-11 w-11 ring-2 ring-background hover:ring-primary/20 transition-all">
              <AvatarImage src={author?.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {author?.fullName?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={author ? `/profile/${author.id}` : "/profile"}
                  className="font-semibold text-[15px] hover:text-primary hover:underline leading-tight block truncate"
                >
                  {author?.fullName ?? "Member"}
                </Link>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 capitalize font-normal">
                    {memberTypeLabel(author?.memberType)}
                  </Badge>
                  {author?.isConsultant && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                      Mentor
                    </Badge>
                  )}
                  {(post.postType ?? "update") === "job" && (
                    <Badge className="text-[10px] h-5 px-1.5 bg-primary/10 text-primary border-0 font-normal">
                      <Briefcase className="h-3 w-3 mr-0.5" />
                      Job
                    </Badge>
                  )}
                </div>
                {subtitle && (
                  <p className="text-xs text-muted-foreground truncate mt-1">{subtitle}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>

              {isOwnPost && onDelete && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground"
                        aria-label="Post options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={isDeleting}
                        onSelect={(e) => {
                          e.preventDefault();
                          setConfirmDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete post
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the post from the feed. Comments and likes on this post will
                          also be deleted. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={isDeleting}
                          onClick={() => {
                            onDelete(post.id);
                            setConfirmDeleteOpen(false);
                          }}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground/95">
          {post.content}
        </p>

        {post.linkUrl && (
          <div className="mt-3">
            <FeedLinkPreview
              url={post.linkUrl}
              label={post.linkLabel}
              postType={post.postType ?? "update"}
            />
          </div>
        )}

        {post.imageUrl && <FeedPostImage src={post.imageUrl} />}

        {post.videoUrl && youtubeEmbed && (
          <div className="mt-3 rounded-lg overflow-hidden border aspect-video bg-black">
            <iframe
              src={youtubeEmbed}
              title="Post video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {post.videoUrl && !youtubeEmbed && isVideoFile && (
          <div className="mt-3 rounded-lg overflow-hidden border bg-black">
            <video src={post.videoUrl} controls className="w-full max-h-[480px]" />
          </div>
        )}

        {post.videoUrl && !youtubeEmbed && !isVideoFile && (
          <a
            href={post.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
          >
            <Video className="h-4 w-4" />
            Watch video
          </a>
        )}

        {(post.likeCount > 0 || post.commentCount > 0) && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              {post.likeCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Heart className="h-2.5 w-2.5 fill-current" />
                  </span>
                  {post.likeCount}
                </span>
              )}
            </span>
            {post.commentCount > 0 && (
              <button
                type="button"
                className="hover:underline hover:text-foreground"
                onClick={() => setShowComments((v) => !v)}
              >
                {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
              </button>
            )}
          </div>
        )}

        <div className="mt-2 pt-2 border-t flex items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 gap-2 h-9 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg",
              post.likedByMe && "text-primary bg-primary/5 hover:text-primary",
            )}
            disabled={likeMutation.isPending}
            onClick={() => likeMutation.mutate()}
          >
            <Heart className={cn("h-4 w-4", post.likedByMe && "fill-current")} />
            Like
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 gap-2 h-9 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg"
            onClick={() => setShowComments((v) => !v)}
          >
            <MessageCircle className="h-4 w-4" />
            Comment
          </Button>
        </div>

        {showComments && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.author?.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs bg-muted">
                    {comment.author?.fullName?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 rounded-2xl bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{comment.author?.fullName ?? "User"}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {memberTypeLabel(comment.author?.memberType)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      · {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))}

            {post.commentCount > post.comments.length && (
              <p className="text-xs text-muted-foreground text-center">
                Showing latest {post.comments.length} of {post.commentCount} comments
              </p>
            )}

            <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center">
              <Input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="h-9 rounded-full bg-muted/40 border-muted-foreground/15"
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                disabled={!commentText.trim() || commentMutation.isPending}
              >
                {commentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
