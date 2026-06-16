import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { readFileAsBase64 } from "@/lib/feed-utils";
import { uploadProfileAvatar } from "@/lib/profile-api";
import { resolveUploadUrl, withCacheBust } from "@/lib/upload-url";
import {
  ImageCropDialog,
  openImageForCrop,
  revokeCropSrc,
} from "@/components/shared/image-crop-dialog";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

export type ProfilePhotoValue = {
  previewUrl: string;
  data: string;
  mimeType: string;
} | null;

type Props = {
  fullName: string;
  existingUrl?: string | null;
  cacheKey?: string | number | null;
  value: ProfilePhotoValue;
  onChange: (value: ProfilePhotoValue) => void;
  onError?: (message: string) => void;
  /** Upload immediately when a file is chosen (profile edit). */
  uploadOnPick?: boolean;
  onUploaded?: (avatarUrl: string) => void;
};

export function ProfilePhotoPicker({
  fullName,
  existingUrl,
  cacheKey,
  value,
  onChange,
  onError,
  uploadOnPick,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSource, setCropSource] = useState<{ src: string; file: File } | null>(null);
  const initial = fullName.trim().charAt(0).toUpperCase() || "?";
  const serverPreview = withCacheBust(resolveUploadUrl(existingUrl), cacheKey);
  const previewUrl = value?.previewUrl ?? serverPreview;

  const handlePick = async (file: File) => {
    const mimeType = file.type || "image/jpeg";
    if (!ALLOWED_TYPES.has(mimeType)) {
      onError?.("Use JPG, PNG, WebP, or GIF for your profile photo.");
      return;
    }
    if (file.size > MAX_BYTES) {
      onError?.("Profile photo must be 5 MB or smaller.");
      return;
    }

    try {
      const data = await readFileAsBase64(file);
      if (uploadOnPick) {
        setUploading(true);
        const updated = await uploadProfileAvatar(data, mimeType);
        if (updated.avatarUrl) {
          onUploaded?.(updated.avatarUrl);
        }
        onChange(null);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      onChange({ previewUrl, data, mimeType });
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Could not upload profile photo.");
    } finally {
      setUploading(false);
    }
  };

  const clearPhoto = () => {
    if (value?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(value.previewUrl);
    }
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <Avatar className="h-16 w-16 border-2 border-border">
          <AvatarImage src={previewUrl} alt="Profile preview" />
          <AvatarFallback className="text-lg bg-primary/10 text-primary">{initial}</AvatarFallback>
        </Avatar>
        {value && !uploading && (
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Remove photo"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-background/70 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="space-y-1 min-w-0">
        <p className="text-sm font-medium">Profile photo</p>
        <p className="text-xs text-muted-foreground">
          {uploadOnPick
            ? "Uploads right away and shows across your profile, feed, and sidebar."
            : "Optional. Shown on your profile and across the app."}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const mimeType = file.type || "image/jpeg";
              if (!ALLOWED_TYPES.has(mimeType)) {
                onError?.("Use JPG, PNG, WebP, or GIF for your profile photo.");
              } else if (file.size > MAX_BYTES) {
                onError?.("Profile photo must be 5 MB or smaller.");
              } else {
                const next = openImageForCrop(file);
                if (next) setCropSource(next);
              }
            }
            e.target.value = "";
          }}
        />
        <ImageCropDialog
          open={Boolean(cropSource)}
          onOpenChange={(open) => {
            if (!open) {
              revokeCropSrc(cropSource?.src);
              setCropSource(null);
            }
          }}
          imageSrc={cropSource?.src ?? ""}
          fileName={cropSource?.file.name ?? "profile.jpg"}
          mimeType={cropSource?.file.type ?? "image/jpeg"}
          aspect={1}
          cropShape="round"
          title="Crop profile photo"
          description="Drag to reposition, rotate if sideways, then zoom."
          onConfirm={async (file) => {
            revokeCropSrc(cropSource?.src);
            setCropSource(null);
            await handlePick(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          {uploading ? "Uploading..." : previewUrl ? "Change photo" : "Upload photo"}
        </Button>
      </div>
    </div>
  );
}
