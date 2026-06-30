import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthSplitLayout({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Wider card for sign-up form */
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="fade-bar-x absolute inset-x-0 top-0" aria-hidden />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo className="h-9 w-9" linked={false} />
            <span className="text-lg font-bold tracking-tight">{BRAND.name}</span>
          </Link>
          <Button variant="ghost" className="h-10 rounded-full gap-2 px-5 text-sm text-muted-foreground" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-muted/25 via-background to-background px-4 py-10 sm:py-14">
        <div
          className={cn(
            "w-full landing-fade-up",
            wide ? "max-w-xl" : "max-w-md",
          )}
        >
          <div className="landing-hover-lift overflow-visible rounded-2xl border border-border/80 bg-card p-6 shadow-md sm:p-8">
            <div className="mb-6 space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{subtitle}</p>
            </div>
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms &amp; Conditions
            </Link>
            <span className="mx-2">·</span>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact us
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
