import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";

function getEmailFromSearch(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("email")?.trim() ?? "";
}

export default function VerifyEmailPendingPage() {
  const search = useSearch();
  const { resendVerificationEmail } = useAuth();
  const email = getEmailFromSearch(search);

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleResend() {
    if (!email) {
      setError("Enter your email on the sign-in page to resend verification.");
      return;
    }

    setStatus("sending");
    setError("");
    try {
      await resendVerificationEmail(email);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not resend email");
    }
  }

  return (
    <AuthSplitLayout
      title="Check your email"
      subtitle="Open the link we sent to verify your email"
    >
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {email ? (
              <>
                Open the link we sent to{" "}
                <span className="font-medium text-foreground">{email}</span>. After you verify,
                come back and sign in.
              </>
            ) : (
              "Open the verification link in your email. After you verify, sign in to continue."
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            The link expires in 24 hours. Check spam if you do not see it.
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        {status === "sent" && (
          <p className="text-sm text-success bg-success/10 px-3 py-2 rounded-lg">
            Verification email sent again.
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-full"
            disabled={!email || status === "sending"}
            onClick={() => void handleResend()}
          >
            {status === "sending" ? "Sending..." : "Resend verification email"}
          </Button>

          <Button asChild className="w-full h-11 rounded-full">
            <Link href="/sign-in">Go to sign in</Link>
          </Button>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
