import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import { HttpError } from "@/lib/http-client";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/lib/brand";

function getSearchParams(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = getSearchParams(search);
  const { signIn } = useAuth();
  const [email, setEmail] = useState(() => params.get("email")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => {
    const verifyError = params.get("verifyError");
    if (verifyError === "expired") {
      return "Verification link expired. Sign in and request a new one, or sign up again.";
    }
    if (verifyError === "invalid") {
      return "Invalid verification link. Request a new one from the sign-in page.";
    }
    if (verifyError === "server") {
      return "Could not verify email. Please try again or request a new link.";
    }
    return "";
  });
  const [notice, setNotice] = useState(() =>
    params.get("verified") === "1"
      ? "Email verified successfully. Sign in to continue."
      : "",
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await signIn(email, password);
      setLocation("/home");
    } catch (err) {
      if (err instanceof HttpError && err.code === "EMAIL_NOT_VERIFIED") {
        const pendingEmail =
          typeof err.data?.email === "string" ? err.data.email : email.trim();
        setLocation(`/verify-email-pending?email=${encodeURIComponent(pendingEmail)}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      title="Welcome back"
      subtitle={`Sign in to continue to ${BRAND.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {notice && (
          <p className="text-sm text-success bg-success/10 px-3 py-2 rounded-lg">{notice}</p>
        )}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-11"
          />
        </div>

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
