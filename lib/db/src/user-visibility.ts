import type { UserDoc } from "./models/user";

/** Mongo filter — only email-verified users appear in public lists and profiles. */
export const publiclyVisibleUserFilter = { emailVerified: true } as const;

export function isUserPubliclyVisible(
  user: Pick<UserDoc, "emailVerified"> | null | undefined,
): boolean {
  return user?.emailVerified === true;
}
