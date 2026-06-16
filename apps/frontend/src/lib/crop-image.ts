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

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

function canvasToFile(canvas: HTMLCanvasElement, fileName: string, mimeType: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not process image"));
          return;
        }
        resolve(new File([blob], fileName, { type: mimeType }));
      },
      mimeType,
      0.92,
    );
  });
}

export async function getCroppedImageFile(
  imageSrc: string,
  crop: CropArea,
  fileName: string,
  mimeType: string = "image/jpeg",
  rotation = 0,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const rotRad = getRadianAngle(rotation);
  const { width: boxWidth, height: boxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = boxWidth;
  canvas.height = boxHeight;

  ctx.translate(boxWidth / 2, boxHeight / 2);
  ctx.rotate(rotRad);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");
  if (!croppedCtx) throw new Error("Canvas not supported");

  croppedCanvas.width = Math.round(crop.width);
  croppedCanvas.height = Math.round(crop.height);

  croppedCtx.drawImage(
    canvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return canvasToFile(croppedCanvas, fileName, mimeType);
}

/** Rotate image by degrees (typically 90) and return a new file + preview URL. */
export async function rotateImageFile(
  imageSrc: string,
  fileName: string,
  mimeType: string,
  rotation: number,
): Promise<{ file: File; previewUrl: string }> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const rotRad = getRadianAngle(rotation);
  const { width, height } = rotateSize(image.width, image.height, rotation);

  canvas.width = width;
  canvas.height = height;

  ctx.translate(width / 2, height / 2);
  ctx.rotate(rotRad);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  const outputMime = cropOutputMimeType(mimeType);
  const ext = outputMime.split("/")[1] ?? "jpg";
  const file = await canvasToFile(
    canvas,
    fileName.replace(/\.[^.]+$/, "") + `.${ext}`,
    outputMime,
  );

  return { file, previewUrl: URL.createObjectURL(file) };
}

export function cropOutputMimeType(sourceMime: string): string {
  if (sourceMime === "image/png" || sourceMime === "image/webp") {
    return sourceMime;
  }
  return "image/jpeg";
}

/** Crop using pixel selection from a displayed img element (react-image-crop). */
export async function getCroppedImageFromElement(
  image: HTMLImageElement,
  crop: CropArea,
  fileName: string,
  mimeType: string = "image/jpeg",
): Promise<File> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(crop.width * scaleX));
  canvas.height = Math.max(1, Math.floor(crop.height * scaleY));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvasToFile(canvas, fileName, mimeType);
}
