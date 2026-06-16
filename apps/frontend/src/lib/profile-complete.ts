import type { UserProfile } from "@workspace/api-client-react";

/** Treat profiles with core fields as done — avoids trapping users after a partial edit */
export function isEffectivelyProfileComplete(profile: UserProfile): boolean {
  if (profile.isProfileComplete) return true;
  return Boolean(
    profile.fullName?.trim() &&
      profile.headline?.trim() &&
      profile.skills?.length > 0,
  );
}
