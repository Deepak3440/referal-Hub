import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  cropOutputMimeType,
  getCroppedImageFromElement,
  rotateImageFile,
} from "@/lib/crop-image";
import { revokeCropSrc } from "@/components/shared/image-crop-dialog";
import { Loader2, RotateCw } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  fileName?: string;
  mimeType?: string;
  onConfirm: (file: File, previewUrl: string) => void | Promise<void>;
};

function defaultCrop(width: number, height: number): Crop {
  return centerCrop(
    {
      unit: "%",
      x: 5,
      y: 5,
      width: 90,
      height: 90,
    },
    width,
    height,
  );
}

export function FeedImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  fileName = "feed.jpg",
  mimeType = "image/jpeg",
  onConfirm,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [source, setSource] = useState(imageSrc);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [busy, setBusy] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (open) {
      setSource(imageSrc);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [open, imageSrc]);

  const onImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = event.currentTarget;
    setCrop(defaultCrop(width, height));
  }, []);

  const handleRotate = async () => {
    if (!source || rotating) return;
    setRotating(true);
    try {
      const { previewUrl } = await rotateImageFile(source, fileName, mimeType, 90);
      if (source.startsWith("blob:") && source !== imageSrc) {
        revokeCropSrc(source);
      }
      setSource(previewUrl);
      setCrop(undefined);
      setCompletedCrop(undefined);
    } finally {
      setRotating(false);
    }
  };

  const handleConfirm = async () => {
    const image = imgRef.current;
    if (!image || !crop) return;

    const pixelCrop =
      completedCrop ??
      convertToPixelCrop(crop, image.width, image.height, image.naturalWidth, image.naturalHeight);

    if (!pixelCrop.width || !pixelCrop.height) return;

    setBusy(true);
    try {
      const outputMime = cropOutputMimeType(mimeType);
      const ext = outputMime.split("/")[1] ?? "jpg";
      const croppedFile = await getCroppedImageFromElement(
        image,
        pixelCrop,
        fileName.replace(/\.[^.]+$/, "") + `.${ext}`,
        outputMime,
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
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>Crop photo</DialogTitle>
          <DialogDescription>
            Drag corners or edges to crop from any side — like your phone camera.
          </DialogDescription>
        </DialogHeader>

        <div className="feed-image-crop relative max-h-[min(58vh,420px)] w-full overflow-auto bg-muted p-3">
          <ReactCrop
            crop={crop}
            onChange={(next) => setCrop(next)}
            onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
            className="mx-auto max-h-[min(52vh,380px)]"
          >
            <img
              ref={imgRef}
              src={source}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-h-[min(52vh,380px)] w-auto max-w-full object-contain"
            />
          </ReactCrop>
        </div>

        <div className="px-5 py-4 space-y-3 border-t bg-card">
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void handleRotate()}
              disabled={busy || rotating}
            >
              {rotating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              Rotate
            </Button>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleConfirm()} disabled={busy || !crop}>
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
