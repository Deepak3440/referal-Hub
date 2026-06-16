import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "@/components/layout/brand-logo";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo className="h-8 w-8" linked={false} />
          <span className="font-bold text-xl tracking-tight">{BRAND.name}</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/sign-in" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            Sign In
          </Link>
          <Link href="/sign-up" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
            Get Started
          </Link>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 max-w-4xl mx-auto">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground mb-6">
          Your network is your <br/><span className="text-primary">career advantage.</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
          {BRAND.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/sign-up" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-12 px-8">
            Join the Community
          </Link>
          <Link href="/home" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-12 px-8">
            Browse Jobs
          </Link>
        </div>
      </main>
    </div>
  );
}
