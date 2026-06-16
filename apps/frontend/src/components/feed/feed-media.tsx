import { Briefcase, Building2, ExternalLink, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getLinkHostname(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return "External link";
  }
}

export function isJobBoardHost(url: string): boolean {
  const host = getLinkHostname(url).toLowerCase();
  return (
    host.includes("naukri") ||
    host.includes("linkedin") ||
    host.includes("indeed") ||
    host.includes("instahyre") ||
    host.includes("glassdoor") ||
    host.includes("wellfound") ||
    host.includes("lever.co") ||
    host.includes("greenhouse")
  );
}

type LinkPreviewProps = {
  url: string;
  label?: string | null;
  postType?: "update" | "job";
  company?: string | null;
  compact?: boolean;
  className?: string;
};

export function FeedLinkPreview({ url, label, postType, company, compact, className }: LinkPreviewProps) {
  const href = normalizeUrl(url);
  const hostname = getLinkHostname(url);
  const isJob = postType === "job" || isJobBoardHost(url);
  const title = label?.trim() || (isJob ? "View job opening" : hostname);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block rounded-xl border border-border bg-muted/30 overflow-hidden",
        "hover:border-primary/40 hover:bg-primary/5 transition-all",
        className,
      )}
    >
      <div className={cn("flex items-stretch", compact ? "min-h-[72px]" : "min-h-[88px]")}>
        <div
          className={cn(
            "w-20 sm:w-24 shrink-0 flex items-center justify-center",
            isJob ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {isJob ? (
            <Briefcase className={cn(compact ? "h-6 w-6" : "h-8 w-8")} />
          ) : (
            <Link2 className={cn(compact ? "h-6 w-6" : "h-8 w-8")} />
          )}
        </div>
        <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col justify-center">
          {!isJob && (
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              Shared link
            </p>
          )}
          {isJob ? (
            <div className="space-y-1">
              <p className="font-semibold text-sm sm:text-base truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{title}</span>
              </p>
              {company && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{company}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="font-semibold text-sm sm:text-base truncate mt-0.5 group-hover:text-primary transition-colors">
              {title}
            </p>
          )}
          <p className="text-xs text-muted-foreground truncate mt-1 flex items-center gap-1">
            {hostname}
            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
          </p>
        </div>
      </div>
    </a>
  );
}

type FeedImageProps = {
  src: string;
  alt?: string;
  className?: string;
};

/** Contained image — avoids huge portrait photos breaking the feed layout */
export function FeedPostImage({ src, alt = "Post image", className }: FeedImageProps) {
  return (
    <div
      className={cn(
        "mt-3 rounded-xl border border-border bg-muted/40 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-center max-h-[min(420px,55vh)] min-h-[120px] p-2 sm:p-3">
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[min(400px,50vh)] w-auto h-auto object-contain rounded-lg shadow-sm"
          loading="lazy"
        />
      </div>
    </div>
  );
}
