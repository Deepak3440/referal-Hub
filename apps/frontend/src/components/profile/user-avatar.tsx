import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveUploadUrl, withCacheBust } from "@/lib/upload-url";
import { cn } from "@/lib/utils";

type Props = {
  fullName: string;
  avatarUrl?: string | null;
  cacheKey?: string | number | null;
  className?: string;
  fallbackClassName?: string;
};

export function UserAvatar({
  fullName,
  avatarUrl,
  cacheKey,
  className,
  fallbackClassName,
}: Props) {
  const initial = fullName.trim().charAt(0).toUpperCase() || "?";

  return (
    <Avatar className={cn(className)}>
      <AvatarImage
        src={withCacheBust(resolveUploadUrl(avatarUrl), cacheKey ?? avatarUrl)}
        alt={fullName}
      />
      <AvatarFallback className={fallbackClassName}>{initial}</AvatarFallback>
    </Avatar>
  );
}
