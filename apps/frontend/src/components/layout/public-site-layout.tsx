import { Link } from "wouter";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";

export function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="fade-bar-x absolute inset-x-0 top-0" aria-hidden />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLogo className="h-9 w-9" linked={false} />
          <span className="text-lg font-bold tracking-tight">{BRAND.name}</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="rounded-full" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" className="rounded-full shadow-sm" asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/20 mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" linked={false} />
            <span className="font-semibold">{BRAND.name}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact us
            </Link>
            <Link href="/sign-in" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/sign-up" className="hover:text-foreground transition-colors">
              Sign up
            </Link>
          </nav>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export function PublicPageLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicSiteHeader />
      <main className="flex-1">
        <div className="border-b border-border/60 bg-muted/20">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12 landing-fade-up">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          <RevealOnScroll>{children}</RevealOnScroll>
        </div>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
