/** Turn stored upload paths into browser-loadable URLs. */
export function resolveUploadUrl(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function withCacheBust(url: string | undefined, key?: string | number | null): string | undefined {
  if (!url) return undefined;
  if (key == null || key === "") return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(String(key))}`;
}
