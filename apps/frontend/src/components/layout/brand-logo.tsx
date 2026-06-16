import { Link } from "wouter";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  imageClassName?: string;
  href?: string | null;
  onClick?: () => void;
  linked?: boolean;
};

export function BrandLogo({
  className,
  imageClassName,
  href = "/home",
  onClick,
  linked = true,
}: Props) {
  const image = (
    <img
      src={BRAND.logoSrc}
      alt={BRAND.name}
      className={cn("h-full w-full object-cover", imageClassName)}
    />
  );

  const shell = (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-xl shadow-sm shadow-primary/20",
        className,
      )}
    >
      {image}
    </span>
  );

  if (linked && href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex shrink-0 hover:opacity-90 transition-opacity"
        aria-label={`Go to ${BRAND.name} dashboard`}
      >
        {shell}
      </Link>
    );
  }

  return shell;
}
