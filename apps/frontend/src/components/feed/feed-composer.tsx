import { useRef, useState } from "react";
import type { UserProfile } from "@workspace/api-client-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { readFileAsBase64 } from "@/lib/feed-utils";
import { feedApi } from "@/lib/feed-api";
import { FeedLinkPreview, FeedPostImage, normalizeUrl } from "@/components/feed/feed-media";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, ImagePlus, Link2, Loader2, PenLine, X } from "lucide-react";
import { cn } from "@/lib/utils";

type PostMode = "update" | "job";

type Props = {
  user: UserProfile;
  onPost: (payload: {
    content: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    linkUrl?: string | null;
    linkLabel?: string | null;
    postType?: "update" | "job";
  }) => Promise<void>;
  isPosting?: boolean;
  embedded?: boolean;
};

export function FeedComposer({ user, onPost, isPosting, embedded }: Props) {
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<PostMode>("update");
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [jobLink, setJobLink] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const resetMedia = () => {
    setImagePreview(null);
    setImageUrl(null);
  };

  const collapse = () => {
    setExpanded(false);
    setContent("");
    setJobLink("");
    setJobTitle("");
    setMode("update");
    resetMedia();
  };

  const openComposer = (nextMode: PostMode) => {
    setMode(nextMode);
    if (nextMode === "update") {
      setJobLink("");
      setJobTitle("");
    } else {
      resetMedia();
    }
    setExpanded(true);
  };

  const switchMode = (nextMode: PostMode) => {
    setMode(nextMode);
    if (nextMode === "update") {
      setJobLink("");
      setJobTitle("");
    } else {
      resetMedia();
    }
  };

  const handleImagePick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    setMode("update");
    setUploading(true);
    try {
      const base64 = await readFileAsBase64(file);
      const saved = await feedApi.uploadMedia(base64, file.type);
      setImageUrl(saved.url);
      setImagePreview(URL.createObjectURL(file));
      setExpanded(true);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Image upload failed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const text = content.trim();
    if (!text) {
      toast({ title: "Write something before posting", variant: "destructive" });
      return;
    }
    if (mode === "job" && !jobLink.trim()) {
      toast({ title: "Add a job link (Naukri, LinkedIn, etc.)", variant: "destructive" });
      return;
    }
    if (jobLink.trim()) {
      try {
        new URL(normalizeUrl(jobLink));
      } catch {
        toast({ title: "Enter a valid link starting with https://", variant: "destructive" });
        return;
      }
    }

    await onPost({
      content: text,
      imageUrl,
      videoUrl: null,
      linkUrl: jobLink.trim() ? normalizeUrl(jobLink) : null,
      linkLabel: jobTitle.trim() || null,
      postType: mode,
    });
    collapse();
  };

  const showLinkPreview = mode === "job" && jobLink.trim().length > 8;
  const firstName = user.fullName.trim().split(/\s+/)[0] || "there";
  const isJob = mode === "job";

  return (
    <div
      className={cn(
        embedded ? "border-b border-border bg-card" : "rounded-xl border border-border bg-card shadow-sm overflow-hidden",
        !expanded && embedded && "border-b-primary/10",
      )}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImagePick(file);
          e.target.value = "";
        }}
      />

      {!expanded ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/[0.06] via-card to-card">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="px-4 pt-4 pb-3 flex items-center gap-3">
            <Link href="/profile" className="shrink-0">
              <UserAvatar
                fullName={user.fullName}
                avatarUrl={user.avatarUrl}
                cacheKey={user.id}
                className="h-12 w-12 ring-2 ring-primary/30 shadow-md shadow-primary/10"
                fallbackClassName="bg-primary text-primary-foreground text-base font-semibold"
              />
            </Link>
            <button
              type="button"
              onClick={() => openComposer("update")}
              className="group flex-1 h-12 rounded-full border border-primary/20 bg-background/90 px-5 text-left text-[15px] shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-md hover:shadow-primary/5"
            >
              <span className="text-muted-foreground transition-colors group-hover:text-foreground/90">
                Start a post,{" "}
                <span className="font-semibold text-primary">{firstName}</span>
              </span>
            </button>
          </div>
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="px-3 sm:px-4 pb-3.5 pt-2.5 flex items-stretch gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading || isPosting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-foreground/80 hover:bg-sky-500/[0.08] transition-colors disabled:opacity-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 ring-1 ring-sky-500/15">
                <ImagePlus className="h-4 w-4 text-sky-600" />
              </span>
              <span className="hidden sm:inline">Photo</span>
            </button>
            <div className="w-px bg-border/60 my-1 hidden sm:block" aria-hidden />
            <button
              type="button"
              onClick={() => openComposer("job")}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-foreground/80 hover:bg-primary/[0.08] transition-colors"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15">
                <Briefcase className="h-4 w-4 text-primary" />
              </span>
              <span className="hidden sm:inline">Post job</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/profile" className="shrink-0">
                <UserAvatar
                  fullName={user.fullName}
                  avatarUrl={user.avatarUrl}
                  cacheKey={user.id}
                  className="h-10 w-10"
                  fallbackClassName="bg-primary text-primary-foreground text-sm font-semibold"
                />
              </Link>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user.fullName}</p>
                <p
                  className={cn(
                    "text-xs font-medium flex items-center gap-1.5 mt-0.5",
                    isJob ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {isJob ? (
                    <>
                      <Briefcase className="h-3.5 w-3.5 shrink-0" />
                      Share a job opening
                    </>
                  ) : (
                    <>
                      <PenLine className="h-3.5 w-3.5 shrink-0" />
                      Create a post
                    </>
                  )}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={collapse}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Textarea
            autoFocus
            placeholder={
              isJob
                ? "Describe the role, company, and experience needed..."
                : `What do you want to talk about, ${firstName}?`
            }
            className="min-h-[100px] resize-none bg-background border-muted-foreground/15 text-sm rounded-xl"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {isJob && (
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Paste job link
              </p>
              <Input
                placeholder="https://naukri.com/... or LinkedIn URL"
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
                className="h-10 bg-background rounded-lg text-sm"
              />
              <Input
                placeholder="Job title (optional)"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="h-10 bg-background rounded-lg text-sm"
              />
              {showLinkPreview && (
                <FeedLinkPreview url={jobLink} label={jobTitle || undefined} postType="job" compact />
              )}
            </div>
          )}

          {imagePreview && imageUrl && (
            <div className="relative">
              <FeedPostImage src={imagePreview} alt="Upload preview" />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
                onClick={resetMedia}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {!isJob && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-sky-600"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading || isPosting}
                >
                  <ImagePlus className="h-3.5 w-3.5 mr-1" />
                  Photo
                </Button>
              )}
              <button
                type="button"
                onClick={() => switchMode(isJob ? "update" : "job")}
                className="text-xs text-primary font-medium hover:underline px-1"
              >
                {isJob ? "Post an update instead" : "Share a job opening instead"}
              </button>
            </div>

            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={collapse}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full px-5 text-xs font-semibold"
                onClick={() => void handleSubmit()}
                disabled={uploading || isPosting || !content.trim()}
              >
                {(uploading || isPosting) && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {isJob ? "Share job" : "Post"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
