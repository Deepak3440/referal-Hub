import { Link, useLocation } from "wouter";
import {
  LayoutGrid,
  Briefcase,
  Send,
  Video,
  User,
  LogOut,
  Newspaper,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@workspace/api-client-react";
import { isAlumniMember, memberTypeLabel } from "@/lib/user-utils";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "@/components/layout/brand-logo";
import { resolveUploadUrl, withCacheBust } from "@/lib/upload-url";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

function SidebarProfile({
  user,
  onSignOut,
}: {
  user?: UserProfile | null;
  onSignOut: () => void;
}) {
  if (!user) return null;

  return (
    <div className="p-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.07] overflow-hidden backdrop-blur-sm">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-3.5 hover:bg-white/[0.06] transition-colors"
        >
          <div className="relative shrink-0">
            <Avatar className="h-11 w-11 ring-2 ring-accent/50 ring-offset-2 ring-offset-sidebar">
              <AvatarImage
                src={withCacheBust(resolveUploadUrl(user.avatarUrl), user.id)}
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {user.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-sidebar" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-tight text-sidebar-foreground">
              {user.fullName}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge
                variant="secondary"
                className="text-[10px] h-5 px-1.5 capitalize font-normal bg-white/12 text-sidebar-foreground border-white/10 hover:bg-white/12"
              >
                {memberTypeLabel(user.memberType)}
              </Badge>
              <span className="text-[10px] text-sidebar-foreground/65 font-medium">
                {user.totalPoints} pts
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-sidebar-foreground/40 shrink-0" />
        </Link>

        <div className="px-3 pb-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-9 font-medium border-white/15 bg-transparent text-sidebar-foreground/85 hover:bg-white/10 hover:text-sidebar-foreground hover:border-white/25 transition-colors"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({
  user,
  pendingReferralCount,
  pendingConsultCount,
  onSignOut,
  onNavigate,
}: {
  user?: UserProfile | null;
  pendingReferralCount: number;
  pendingConsultCount: number;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();
  const isAlumni = isAlumniMember(user);

  const navItems: NavItem[] = [
    { href: "/home", label: "Dashboard", icon: LayoutGrid },
    { href: "/feed", label: "Feed", icon: Newspaper },
    ...(isAlumni
      ? [{ href: "/my-listings", label: "Offer Referrals", icon: Briefcase, badge: pendingReferralCount }]
      : []),
    { href: "/referrals", label: "Track Requests", icon: Send },
    { href: "/consult", label: "Mentorship", icon: Video, badge: pendingConsultCount },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <aside className="font-sidebar relative flex h-full min-h-[100dvh] w-[252px] shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="fade-bar-x absolute inset-x-0 top-0 z-10" aria-hidden />
      <div className="fade-bar-y absolute right-0 top-0 bottom-0 z-10" aria-hidden />
      <Link
        href="/feed"
        onClick={onNavigate}
        className="relative flex h-[60px] items-center gap-3 px-5 hover:bg-white/[0.06] transition-colors"
        aria-label="Go to feed"
      >
        <div className="fade-bar-x absolute inset-x-4 bottom-0 opacity-70" aria-hidden />
        <BrandLogo className="h-10 w-10" linked={false} />
        <p className="font-bold text-base tracking-tight text-sidebar-foreground leading-none">
          {BRAND.name}
        </p>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/45">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive =
            location === item.href || location.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-black/20 font-semibold"
                  : "text-sidebar-foreground/75 font-medium hover:bg-white/10 hover:text-sidebar-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-[1.125rem] w-[1.125rem] shrink-0 stroke-[2.25]",
                  isActive ? "text-primary-foreground" : "text-sidebar-foreground/70",
                )}
              />
              <span className="flex-1 tracking-tight">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  className={cn(
                    "min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center px-1.5",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-warning text-warning-foreground",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-white/[0.08] mt-auto">
        <div className="fade-bar-x absolute inset-x-4 top-0 opacity-60" aria-hidden />
        <SidebarProfile user={user} onSignOut={onSignOut} />
      </div>
    </aside>
  );
}
