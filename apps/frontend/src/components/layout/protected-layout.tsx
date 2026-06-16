import { useGetMe, getGetMeQueryKey, useListReferrals, getListReferralsQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { consultApi, CONSULT_QUERY_KEYS } from "@/lib/consult-api";
import { isAlumniMember } from "@/lib/user-utils";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { AppSidebar } from "./app-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { cn } from "@/lib/utils";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: userProfile, isLoading: isLoadingProfile } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: isLoaded && isSignedIn,
      refetchInterval: 60_000,
    },
  });

  const isAlumni = isAlumniMember(userProfile);

  const { data: receivedReferrals } = useListReferrals(
    { role: "referrer" },
    {
      query: {
        enabled: isLoaded && isSignedIn && isAlumni,
        queryKey: getListReferralsQueryKey({ role: "referrer" }),
      },
    },
  );
  const pendingReferralCount = receivedReferrals?.filter((r) => r.status === "pending").length ?? 0;

  const { data: consultSessions } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.list("consultant"),
    queryFn: () => consultApi.listConsultations("consultant"),
    enabled: isLoaded && isSignedIn,
  });
  const pendingConsultCount =
    consultSessions?.filter((s) => s.status === "pending").length ?? 0;

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/sign-in");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded || !isSignedIn || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    );
  }

  const isFullBleed = location.startsWith("/messages");
  const isFeed = location === "/feed" || location.startsWith("/feed/");

  const handleSignOut = () => {
    signOut();
    setLocation("/");
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-muted/30">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        <AppSidebar
          user={userProfile}
          pendingReferralCount={pendingReferralCount}
          pendingConsultCount={pendingConsultCount}
          onSignOut={handleSignOut}
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <DashboardHeader
          user={userProfile}
          pendingReferralCount={pendingReferralCount}
          pendingConsultCount={pendingConsultCount}
          onSignOut={handleSignOut}
        />

        <main
          className={cn(
            "flex-1 overflow-y-auto",
            !isFullBleed && "bg-muted/30",
          )}
        >
          {isFullBleed ? (
            children
          ) : (
            <div
              className={cn(
                "mx-auto w-full",
                isFeed ? "p-3 md:p-4 max-w-6xl" : "p-4 md:p-6 lg:p-8 max-w-6xl",
              )}
            >
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
