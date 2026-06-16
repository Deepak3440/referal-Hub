import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cropOutputMimeType, rotateImageFile } from "@/lib/crop-image";
import { Loader2, RotateCw } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  fileName?: string;
  mimeType?: string;
  title?: string;
  description?: string;
  onConfirm: (file: File, previewUrl: string) => void | Promise<void>;
};

export function ImageRotateDialog({
  open,
  onOpenChange,
  imageSrc,
  fileName = "image.jpg",
  mimeType = "image/jpeg",
  title = "Rotate photo",
  description = "Use rotate if your photo is sideways, then continue.",
  onConfirm,
}: Props) {
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setRotation(0);
  }, [open, imageSrc]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      if (rotation === 0) {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        const outputMime = cropOutputMimeType(mimeType);
        const ext = outputMime.split("/")[1] ?? "jpg";
        const file = new File([blob], fileName.replace(/\.[^.]+$/, "") + `.${ext}`, {
          type: outputMime,
        });
        const previewUrl = URL.createObjectURL(file);
        await onConfirm(file, previewUrl);
      } else {
        const { file, previewUrl } = await rotateImageFile(imageSrc, fileName, mimeType, rotation);
        await onConfirm(file, previewUrl);
      }
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative flex min-h-[min(52vh,360px)] w-full items-center justify-center bg-muted p-4">
          <img
            src={imageSrc}
            alt="Preview"
            className="max-h-[min(48vh,320px)] max-w-full rounded-md object-contain shadow-sm transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        </div>

        <div className="px-5 py-4 space-y-3 border-t bg-card">
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              disabled={busy}
            >
              <RotateCw className="h-4 w-4" />
              Rotate
            </Button>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleConfirm()} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                "Use photo"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
