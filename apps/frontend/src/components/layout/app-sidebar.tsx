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
      <div className="rounded-xl border border-border/80 bg-gradient-to-b from-card to-muted/30 overflow-hidden shadow-sm">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors"
        >
          <div className="relative shrink-0">
            <Avatar className="h-11 w-11 ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
              <AvatarImage
                src={withCacheBust(resolveUploadUrl(user.avatarUrl), user.id)}
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {user.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-tight">{user.fullName}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 capitalize font-normal">
                {memberTypeLabel(user.memberType)}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">
                {user.totalPoints} pts
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        </Link>

        <div className="px-3 pb-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-9 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-colors"
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
    <aside className="flex h-full w-[252px] shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      <Link
        href="/home"
        onClick={onNavigate}
        className="flex h-[60px] items-center gap-3 px-5 border-b border-sidebar-border hover:bg-muted/40 transition-colors"
        aria-label="Go to dashboard"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-md shadow-primary/25 shrink-0">
          {BRAND.logoLetter}
        </div>
        <p className="font-bold text-[15px] tracking-tight text-foreground leading-none">{BRAND.name}</p>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary-foreground")} />
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  className={cn(
                    "min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center px-1.5",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border mt-auto">
        <SidebarProfile user={user} onSignOut={onSignOut} />
      </div>
    </aside>
  );
}
