/** Deterministic avatar / company tile backgrounds aligned with brand palette */
const AVATAR_BG_CLASSES = [
  "bg-primary",
  "bg-brand-dark",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-orange-600",
  "bg-rose-600",
] as const;

export function avatarBgClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_BG_CLASSES[Math.abs(hash) % AVATAR_BG_CLASSES.length];
}

/** @deprecated Use avatarBgClass — kept for existing imports */
export const companyColor = avatarBgClass;
