import { useRef, useState } from "react";
import type { UserProfile } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  const handleImagePick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
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

  return (
    <div
      className={cn(
        embedded ? "border-b border-border bg-card" : "rounded-xl border border-border bg-card shadow-sm overflow-hidden",
      )}
    >
      {!expanded ? (
        <div className="p-3 flex items-center gap-3">
          <Link href="/profile" className="shrink-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {user.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex-1 h-10 rounded-full border border-muted-foreground/20 bg-muted/30 px-4 text-left text-sm text-muted-foreground hover:bg-muted/50 hover:border-primary/20 transition-all"
          >
            Start a post...
          </button>
        </div>
      ) : (
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {user.fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <p className="text-sm font-semibold truncate">{user.fullName}</p>
          </div>

          <div className="flex p-0.5 rounded-lg bg-muted/50 border border-border/60 gap-0.5">
            <button
              type="button"
              onClick={() => setMode("update")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all",
                mode === "update"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <PenLine className="h-3.5 w-3.5" />
              Update
            </button>
            <button
              type="button"
              onClick={() => setMode("job")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all",
                mode === "job"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Post job
            </button>
          </div>

          <Textarea
            autoFocus
            placeholder={
              mode === "job"
                ? "Describe the role, company, experience..."
                : "Share tips, news, or career advice..."
            }
            className="min-h-[80px] resize-none bg-background border-muted-foreground/15 text-sm rounded-lg"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {mode === "job" && (
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-[11px] font-semibold text-primary flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Job link
              </p>
              <Input
                placeholder="https://naukri.com/... or LinkedIn URL"
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
                className="h-9 bg-background rounded-md text-sm"
              />
              <Input
                placeholder="Job title (optional)"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="h-9 bg-background rounded-md text-sm"
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
        </div>
      )}

      <div className="px-3 py-2 border-t flex flex-wrap items-center justify-between gap-2 bg-muted/20">
        <div className="flex gap-1">
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-sky-600"
            onClick={() => {
              setExpanded(true);
              imageInputRef.current?.click();
            }}
            disabled={uploading || isPosting}
          >
            <ImagePlus className="h-3.5 w-3.5 mr-1" />
            Photo
          </Button>
        </div>

        {expanded && (
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={collapse}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-full px-4 text-xs font-semibold"
              onClick={() => void handleSubmit()}
              disabled={uploading || isPosting || !content.trim()}
            >
              {(uploading || isPosting) && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {mode === "job" ? "Share job" : "Post"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
