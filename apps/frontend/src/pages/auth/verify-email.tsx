import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

type VerifyState = "loading" | "success" | "error";

function getTokenFromSearch(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("token")?.trim() ?? "";
}

export default function VerifyEmailPage() {
  const search = useSearch();
  const { verifyEmail } = useAuth();
  const token = getTokenFromSearch(search);

  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Invalid verification link. Request a new one from sign in.");
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const result = await verifyEmail(token);
        if (cancelled) return;
        setVerifiedEmail(result.email);
        setState("success");
        setMessage("Your email is verified. You can sign in now.");
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setMessage(err instanceof Error ? err.message : "Could not verify email");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, verifyEmail]);

  const signInHref = verifiedEmail
    ? `/sign-in?email=${encodeURIComponent(verifiedEmail)}`
    : "/sign-in";

  return (
    <AuthSplitLayout
      title="Email verification"
      subtitle={`Confirm your account on ${BRAND.name}`}
    >
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 text-center space-y-3">
          {state === "loading" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your email...</p>
            </>
          )}

          {state === "success" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <p className="text-sm text-foreground">{message}</p>
            </>
          )}

          {state === "error" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive">{message}</p>
            </>
          )}
        </div>

        {state === "success" && (
          <Button asChild className="w-full h-11">
            <Link href={signInHref}>Sign in</Link>
          </Button>
        )}

        {state === "error" && (
          <div className="flex flex-col gap-3">
            <Button asChild variant="outline" className="w-full h-11">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild className="w-full h-11">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
}
