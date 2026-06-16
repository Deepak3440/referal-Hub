import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
const POSTS_DIR = path.join(UPLOADS_ROOT, "posts");
const AVATARS_DIR = path.join(UPLOADS_ROOT, "avatars");
const RESUMES_DIR = path.join(UPLOADS_ROOT, "resumes");

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getUploadsRoot() {
  ensureDir(POSTS_DIR);
  ensureDir(AVATARS_DIR);
  ensureDir(RESUMES_DIR);
  return UPLOADS_ROOT;
}

function extForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "application/pdf":
      return ".pdf";
    case "application/msword":
      return ".doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    default:
      return "";
  }
}

export function savePostMedia(
  base64Data: string,
  mimeType: string,
): { url: string; kind: "image" | "video" } {
  const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);
  const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);
  if (!isImage && !isVideo) {
    throw new Error("Unsupported file type. Use JPG, PNG, WebP, GIF, MP4, or WebM.");
  }

  const buffer = Buffer.from(base64Data, "base64");
  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (buffer.length > maxBytes) {
    throw new Error(
      isImage ? "Image must be 5 MB or smaller." : "Video must be 25 MB or smaller.",
    );
  }

  ensureDir(POSTS_DIR);
  const ext = extForMime(mimeType);
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const filePath = path.join(POSTS_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  return {
    url: `/api/uploads/posts/${filename}`,
    kind: isImage ? "image" : "video",
  };
}

export function saveAvatarImage(base64Data: string, mimeType: string): { url: string } {
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new Error("Unsupported image type. Use JPG, PNG, WebP, or GIF.");
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Profile photo must be 5 MB or smaller.");
  }

  ensureDir(AVATARS_DIR);
  const ext = extForMime(mimeType);
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const filePath = path.join(AVATARS_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  return { url: `/api/uploads/avatars/${filename}` };
}

export function saveResumeDocument(base64Data: string, mimeType: string): { url: string } {
  if (!ALLOWED_RESUME_TYPES.has(mimeType)) {
    throw new Error("Unsupported resume type. Use PDF or Word (.doc, .docx).");
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length > MAX_RESUME_BYTES) {
    throw new Error("Resume must be 5 MB or smaller.");
  }

  ensureDir(RESUMES_DIR);
  const ext = extForMime(mimeType);
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const filePath = path.join(RESUMES_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  return { url: `/api/uploads/resumes/${filename}` };
}
