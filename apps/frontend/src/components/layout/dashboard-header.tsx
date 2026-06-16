import { useState } from "react";
import { useLocation } from "wouter";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "./app-sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getPageTitle } from "@/lib/page-titles";
import type { UserProfile } from "@workspace/api-client-react";

export function DashboardHeader({
  user,
  pendingReferralCount,
  pendingConsultCount,
  onSignOut,
}: {
  user?: UserProfile | null;
  pendingReferralCount: number;
  pendingConsultCount: number;
  onSignOut: () => void;
}) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = getPageTitle(location);

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-card shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
      <div className="flex h-[56px] items-center gap-4 px-4 lg:px-6">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden shrink-0 h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[260px]">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppSidebar
              user={user}
              pendingReferralCount={pendingReferralCount}
              pendingConsultCount={pendingConsultCount}
              onSignOut={onSignOut}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate leading-tight">
            {pageTitle}
          </h1>
        </div>

        <div className="ml-auto shrink-0">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
