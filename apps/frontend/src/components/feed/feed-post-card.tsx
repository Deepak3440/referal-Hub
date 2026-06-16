import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FeedPost } from "@/lib/feed-api";
import { feedApi, FEED_QUERY_KEYS } from "@/lib/feed-api";
import { getYoutubeEmbedUrl, readFileAsBase64 } from "@/lib/feed-utils";
import { memberTypeLabel } from "@/lib/user-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  Video,
  Briefcase,
  Building2,
  X,
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
import { FeedLinkPreview, FeedPostImage, normalizeUrl } from "@/components/feed/feed-media";
import { revokeCropSrc } from "@/components/shared/image-crop-dialog";

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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editJobLink, setEditJobLink] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);

  const author = post.author;
  const isJobPost = (post.postType ?? "update") === "job";
  const canEditImage = !isJobPost;
  const showLinkFields = isJobPost || Boolean(post.linkUrl) || Boolean(post.imageUrl);
  const wasEdited =
    Boolean(post.updatedAt) &&
    new Date(post.updatedAt!).getTime() - new Date(post.createdAt).getTime() > 1000;
  const youtubeEmbed = post.videoUrl ? getYoutubeEmbedUrl(post.videoUrl) : null;
  const isVideoFile = post.videoUrl?.includes("/api/uploads/");
  const isOwnPost = post.authorId === currentUserId;

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

  const updateMutation = useMutation({
    mutationFn: () => {
      const content = editContent.trim();
      if (!content) {
        throw new Error("Write something to post");
      }
      if (isJobPost && !editJobLink.trim()) {
        throw new Error("Job link is required for job posts");
      }
      if (editJobLink.trim()) {
        try {
          new URL(normalizeUrl(editJobLink));
        } catch {
          throw new Error("Enter a valid link");
        }
      }

      return feedApi.updatePost(post.id, {
        content,
        imageUrl: canEditImage ? editImageUrl : post.imageUrl,
        videoUrl: post.videoUrl,
        postType: post.postType ?? "update",
        linkUrl: editJobLink.trim() ? normalizeUrl(editJobLink) : null,
        linkLabel: editJobTitle.trim() || null,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(FEED_QUERY_KEYS.list(page), (old: { items: FeedPost[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((p) => (p.id === updated.id ? updated : p)),
        };
      });
      if (editImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(editImagePreview);
      }
      setIsEditing(false);
      setEditContent("");
      setEditJobLink("");
      setEditJobTitle("");
      setEditImageUrl(null);
      setEditImagePreview(null);
      setEditUploading(false);
      toast({ title: "Post updated" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const clearEditImagePreview = () => {
    if (editImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editImagePreview);
    }
  };

  const startEditing = () => {
    setEditContent(post.content);
    setEditJobLink(post.linkUrl ?? "");
    setEditJobTitle(post.linkLabel ?? "");
    setEditImageUrl(post.imageUrl);
    setEditImagePreview(post.imageUrl);
    setIsEditing(true);
    setShowComments(false);
  };

  const cancelEditing = () => {
    clearEditImagePreview();
    setIsEditing(false);
    setEditContent("");
    setEditJobLink("");
    setEditJobTitle("");
    setEditImageUrl(null);
    setEditImagePreview(null);
    setEditUploading(false);
  };

  const uploadEditImage = async (file: File, previewUrl: string) => {
    setEditUploading(true);
    try {
      const base64 = await readFileAsBase64(file);
      const saved = await feedApi.uploadMedia(base64, file.type);
      clearEditImagePreview();
      setEditImageUrl(saved.url);
      setEditImagePreview(previewUrl);
    } catch (err) {
      revokeCropSrc(previewUrl);
      toast({
        title: err instanceof Error ? err.message : "Image upload failed",
        variant: "destructive",
      });
    } finally {
      setEditUploading(false);
    }
  };

  const removeEditImage = () => {
    clearEditImagePreview();
    setEditImageUrl(null);
    setEditImagePreview(null);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    commentMutation.mutate(text);
  };

  const timeLabel = `${formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}${
    wasEdited && !isEditing ? " · Edited" : ""
  }`;

  return (
    <article className="bg-card hover:bg-muted/10 transition-colors">
      <div className="p-3 sm:px-4 sm:py-4">
        <div className="flex items-start gap-3">
          <Link href={author ? `/profile/${author.id}` : "/profile"} className="shrink-0">
            <Avatar className="h-11 w-11 ring-2 ring-background hover:ring-primary/20 transition-all">
              <AvatarImage src={author?.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {author?.fullName?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={author ? `/profile/${author.id}` : "/profile"}
                    className="font-semibold text-[15px] hover:text-primary hover:underline leading-tight truncate min-w-0"
                  >
                    {author?.fullName ?? "Member"}
                  </Link>
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
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
                </div>
                {(author?.currentRole || author?.company) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5 leading-snug">
                    {author?.currentRole && (
                      <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        <span className="truncate">{author.currentRole}</span>
                      </span>
                    )}
                    {author?.company && (
                      <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{author.company}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isOwnPost && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground"
                        aria-label="Post options"
                        disabled={isEditing}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          startEditing();
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit post
                      </DropdownMenuItem>
                      {onDelete && (
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
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {onDelete && (
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
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 min-w-0 sm:ml-14">
        {isEditing ? (
          <div className="mt-3 space-y-3">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (!file.type.startsWith("image/")) {
                    toast({ title: "Please choose an image file", variant: "destructive" });
                  } else {
                    const previewUrl = URL.createObjectURL(file);
                    void uploadEditImage(file, previewUrl);
                  }
                }
                e.target.value = "";
              }}
            />
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="What do you want to talk about?"
              className="min-h-[100px] resize-none text-sm"
              autoFocus
            />
            {showLinkFields && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                <Input
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  placeholder={isJobPost ? "Job title (optional)" : "Link title (optional)"}
                  className="h-9"
                />
                <Input
                  value={editJobLink}
                  onChange={(e) => setEditJobLink(e.target.value)}
                  placeholder={isJobPost ? "Job link (https://...)" : "Link (https://...)"}
                  className="h-9"
                />
                {editJobLink.trim().length > 8 && (
                  <FeedLinkPreview
                    url={editJobLink}
                    label={editJobTitle || undefined}
                    postType={post.postType ?? "update"}
                    company={author?.company}
                    compact
                  />
                )}
              </div>
            )}
            {canEditImage && (
              <div className="space-y-2">
                {editImagePreview ? (
                  <div className="relative">
                    <FeedPostImage src={editImagePreview} alt="Post image" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs shadow-md"
                        disabled={editUploading || updateMutation.isPending}
                        onClick={() => imageInputRef.current?.click()}
                      >
                        {editUploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Change photo"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 shadow-md"
                        disabled={editUploading || updateMutation.isPending}
                        onClick={removeEditImage}
                        aria-label="Remove photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    disabled={editUploading || updateMutation.isPending}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {editUploading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Add photo
                  </Button>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                disabled={updateMutation.isPending || editUploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => updateMutation.mutate()}
                disabled={!editContent.trim() || updateMutation.isPending || editUploading}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground/95">
            {post.content}
          </p>
        )}

        {!isEditing && post.linkUrl && (
          <div className="mt-3">
            <FeedLinkPreview
              url={post.linkUrl}
              label={post.linkLabel}
              postType={post.postType ?? "update"}
              company={author?.company}
            />
          </div>
        )}

        {!isEditing && post.imageUrl && <FeedPostImage src={post.imageUrl} />}

        {!isEditing && post.videoUrl && youtubeEmbed && (
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

        {!isEditing && post.videoUrl && !youtubeEmbed && isVideoFile && (
          <div className="mt-3 rounded-lg overflow-hidden border bg-black">
            <video src={post.videoUrl} controls className="w-full max-h-[480px]" />
          </div>
        )}

        {!isEditing && post.videoUrl && !youtubeEmbed && !isVideoFile && (
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

        {!isEditing && (post.likeCount > 0 || post.commentCount > 0) && (
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

        {!isEditing && (
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
        )}

        {!isEditing && (
          <p className="mt-1.5 text-[11px] text-muted-foreground leading-none">{timeLabel}</p>
        )}

        {!isEditing && showComments && (
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
      </div>

    </article>
  );
}
