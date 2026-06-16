import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import type { ReactNode } from "react";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import SignInPage from "@/pages/auth/sign-in";
import SignUpPage from "@/pages/auth/sign-up";
import VerifyEmailPage from "@/pages/auth/verify-email";
import VerifyEmailPendingPage from "@/pages/auth/verify-email-pending";
import { ProtectedLayout } from "@/components/layout/protected-layout";

import Home from "@/pages/home";
import FeedPage from "@/pages/feed";
import NotificationsPage from "@/pages/notifications";
import JobDetail from "@/pages/jobs/job-detail";
import MyListings from "@/pages/my-listings";
import Referrals from "@/pages/referrals";
import ConsultPage from "@/pages/consult";
import MentorDetail from "@/pages/consult/mentor-detail";
import Messages from "@/pages/messages";
import MyProfile from "@/pages/profile/my-profile";
import UserProfile from "@/pages/profile/user-profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Wrap authenticated pages — flat top-level routes so /jobs/:id params work */
function AuthPage({ children }: { children: ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}

function HomeRedirect() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Redirect to="/home" />;
  return <Landing />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/verify-email-pending" component={VerifyEmailPendingPage} />

      <Route path="/complete-profile">
        <Redirect to="/home" />
      </Route>
      <Route path="/home">
        <AuthPage><Home /></AuthPage>
      </Route>
      <Route path="/feed">
        <AuthPage><FeedPage /></AuthPage>
      </Route>
      <Route path="/notifications">
        <AuthPage><NotificationsPage /></AuthPage>
      </Route>
      <Route path="/jobs/:id">
        <AuthPage><JobDetail /></AuthPage>
      </Route>
      <Route path="/my-listings">
        <AuthPage><MyListings /></AuthPage>
      </Route>
      <Route path="/referrals">
        <AuthPage><Referrals /></AuthPage>
      </Route>
      <Route path="/consult/:userId">
        <AuthPage><MentorDetail /></AuthPage>
      </Route>
      <Route path="/consult">
        <AuthPage><ConsultPage /></AuthPage>
      </Route>
      <Route path="/messages">
        <AuthPage><Messages /></AuthPage>
      </Route>
      <Route path="/profile">
        <AuthPage><MyProfile /></AuthPage>
      </Route>
      <Route path="/profile/:id">
        <AuthPage><UserProfile /></AuthPage>
      </Route>

      <Route>
        <AuthPage><NotFound /></AuthPage>
      </Route>
    </Switch>
  );
}

function AppRoutes() {
  return (
    <WouterRouter base={basePath}>
      <Router />
    </WouterRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
