import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cropOutputMimeType, getCroppedImageFile } from "@/lib/crop-image";
import { Loader2, RotateCw } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  fileName?: string;
  mimeType?: string;
  aspect?: number;
  cropShape?: "rect" | "round";
  title?: string;
  description?: string;
  showGrid?: boolean;
  onConfirm: (file: File, previewUrl: string) => void | Promise<void>;
};

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  fileName = "image.jpg",
  mimeType = "image/jpeg",
  aspect,
  cropShape = "rect",
  title = "Crop image",
  description = "Drag to reposition and use the slider to zoom.",
  showGrid = false,
  onConfirm,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedArea(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setBusy(true);
    try {
      const outputMime = cropOutputMimeType(mimeType);
      const ext = outputMime.split("/")[1] ?? "jpg";
      const croppedFile = await getCroppedImageFile(
        imageSrc,
        croppedArea,
        fileName.replace(/\.[^.]+$/, "") + `.${ext}`,
        outputMime,
        rotation,
      );
      const previewUrl = URL.createObjectURL(croppedFile);
      await onConfirm(croppedFile, previewUrl);
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

        <div className="relative h-[min(52vh,360px)] w-full bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            {...(aspect != null ? { aspect } : {})}
            cropShape={cropShape}
            showGrid={showGrid}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-5 py-4 space-y-3 border-t bg-card">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[180px]">
              <span className="text-xs text-muted-foreground w-10 shrink-0">Zoom</span>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={(value) => setZoom(value[0] ?? 1)}
                className="flex-1"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
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
            <Button type="button" onClick={() => void handleConfirm()} disabled={busy || !croppedArea}>
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

/** Opens crop UI after a file is chosen; returns null if validation fails. */
export function openImageForCrop(file: File): { src: string; file: File } | null {
  if (!file.type.startsWith("image/")) return null;
  return { src: URL.createObjectURL(file), file };
}

export function revokeCropSrc(src: string | null | undefined) {
  if (src?.startsWith("blob:")) {
    URL.revokeObjectURL(src);
  }
}
