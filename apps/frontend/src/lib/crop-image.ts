export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image"));
    image.src = src;
  });
}

export async function getCroppedImageFile(
  imageSrc: string,
  crop: CropArea,
  fileName: string,
  mimeType: string = "image/jpeg",
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  canvas.width = Math.round(crop.width);
  canvas.height = Math.round(crop.height);

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not crop image"));
          return;
        }
        resolve(new File([blob], fileName, { type: mimeType }));
      },
      mimeType,
      0.92,
    );
  });
}

export function cropOutputMimeType(sourceMime: string): string {
  if (sourceMime === "image/png" || sourceMime === "image/webp") {
    return sourceMime;
  }
  return "image/jpeg";
}
