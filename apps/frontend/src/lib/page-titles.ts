import { BRAND } from "@/lib/brand";

const PAGE_TITLES: Record<string, string> = {
  "/home": "Dashboard",
  "/feed": "Feed",
  "/notifications": "Notifications",
  "/my-listings": "Offer Referrals",
  "/referrals": "Track Requests",
  "/consult": "Mentorship",
  "/profile": "Profile",
  "/messages": "Messages",
};

export function getPageTitle(path: string): string {
  if (PAGE_TITLES[path]) return PAGE_TITLES[path];
  if (path.startsWith("/consult/")) return "Mentor Profile";
  if (path.startsWith("/jobs/")) return "Job Details";
  if (path.startsWith("/profile/")) return "Member Profile";
  return BRAND.name;
}
