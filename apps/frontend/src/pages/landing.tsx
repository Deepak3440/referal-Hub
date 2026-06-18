import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { PublicSiteFooter, PublicSiteHeader } from "@/components/layout/public-site-layout";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  MessageSquare,
  Trophy,
  Users,
  Video,
} from "lucide-react";

const FEATURES = [
  {
    icon: Briefcase,
    title: "Job referrals",
    description:
      "Browse openings posted by alumni or request a referral at their company — job-wise or company-wide.",
  },
  {
    icon: Video,
    title: "1:1 mentorship",
    description:
      "Book sessions with experienced alumni for career guidance, interview prep, and honest industry advice.",
  },
  {
    icon: Trophy,
    title: "Earn & track",
    description:
      "Follow every referral request in one place. Alumni earn reward points when candidates move forward.",
  },
] as const;

const STEPS = [
  {
    step: "01",
    title: "Join your community",
    description: "Sign up as a student or alumni and complete your profile with skills and experience.",
  },
  {
    step: "02",
    title: "Request or offer help",
    description: "Ask for referrals, post openings you can refer for, or book a mentorship session.",
  },
  {
    step: "03",
    title: "Move forward together",
    description: "Chat, track status, and celebrate hires — warm introductions beat cold applications.",
  },
] as const;

const TRUST_POINTS = [
  "Alumni-verified network",
  "Transparent referral tracking",
  "Built for students & professionals",
] as const;

const HERO_ROW_DELAYS = ["0.28s", "0.4s", "0.52s"] as const;

function HeroVisual() {
  const rows = [
    {
      icon: Building2,
      iconBg: "bg-primary/15",
      title: "Company referral request",
      sub: "Pending · Alumni at your target company",
      badge: "New",
      highlight: true,
    },
    {
      icon: Briefcase,
      iconBg: "bg-primary/10",
      title: "Senior Engineer · Remote",
      sub: "Posted by alumni · 200 reward pts",
    },
    {
      icon: Video,
      iconBg: "bg-primary/10",
      title: "Mentorship session booked",
      sub: "Tomorrow · 30 min · Google Meet",
    },
  ] as const;

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none landing-fade-up-delay-2">
      <div className="landing-float-slow absolute -left-6 top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="landing-float absolute -right-4 bottom-12 h-32 w-32 rounded-full bg-accent/30 blur-3xl" />

      <div className="landing-hover-lift relative space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-md">
        {rows.map((row, index) => {
          const Icon = row.icon;
          return (
            <div
              key={row.title}
              className={cn(
                "landing-fade-up flex items-center gap-3 rounded-xl p-3 transition-colors",
                row.highlight
                  ? "border border-primary/15 bg-primary/5"
                  : "border bg-muted/30",
              )}
              style={{ animationDelay: HERO_ROW_DELAYS[index] }}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  row.iconBg,
                )}
              >
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{row.title}</p>
                <p className="text-xs text-muted-foreground">{row.sub}</p>
              </div>
              {row.badge && (
                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                  {row.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicSiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/10" />
        <div className="landing-gradient-drift pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="landing-gradient-drift pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" style={{ animationDelay: "4s" }} />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
          <div className="space-y-6 text-center lg:text-left">
            <h1 className="landing-fade-up text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Warm referrals.
              <br />
              <span className="text-primary">Real mentorship.</span>
              <br />
              One trusted network.
            </h1>

            <p className="landing-fade-up-delay-2 mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              {BRAND.description}
            </p>

            <div className="landing-fade-up-delay-3 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Button
                size="lg"
                className="h-12 rounded-full px-8 shadow-sm transition-transform duration-300 hover:scale-[1.02]"
                asChild
              >
                <Link href="/sign-up">
                  Create free account
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full px-8 transition-transform duration-300 hover:scale-[1.01]"
                asChild
              >
                <Link href="/sign-in">I already have an account</Link>
              </Button>
            </div>

            <ul className="landing-fade-up-delay-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:justify-start">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <RevealOnScroll className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Why Referaa</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need to grow through your network
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Built for students seeking opportunities and alumni who want to give back.
          </p>
        </RevealOnScroll>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <RevealOnScroll key={feature.title} delay={index * 90}>
                <article
                  className={cn(
                    "landing-hover-lift group h-full rounded-2xl border border-border/80 bg-card p-6 shadow-sm hover:border-primary/25 hover:shadow-md",
                    index === 1 && "sm:col-span-2 lg:col-span-1",
                  )}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <RevealOnScroll className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">How it works</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Three steps to get started</h2>
          </RevealOnScroll>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((item, index) => (
              <RevealOnScroll key={item.step} delay={index * 100}>
                <div className="landing-hover-lift h-full rounded-2xl border border-border/80 bg-card p-6 shadow-sm hover:border-primary/20">
                  <span className="text-3xl font-bold text-primary/20">{item.step}</span>
                  <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* For who */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <RevealOnScroll delay={0}>
            <div className="landing-hover-lift h-full rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8 hover:border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">For students & job seekers</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Discover roles, request referrals from alumni at top companies, book mentorship calls, and
                track every request from one dashboard.
              </p>
              <Button className="mt-6 rounded-full" asChild>
                <Link href="/sign-up">Start as student</Link>
              </Button>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={120}>
            <div className="landing-hover-lift h-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 to-card p-6 shadow-sm sm:p-8 hover:border-primary/35">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">For alumni & professionals</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Post openings you can refer for, review incoming requests, offer mentorship, and earn points
                when candidates succeed.
              </p>
              <Button className="mt-6 rounded-full" variant="default" asChild>
                <Link href="/sign-up">Join as alumni</Link>
              </Button>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <RevealOnScroll>
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-10 sm:py-14">
            <div className="landing-gradient-drift pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative space-y-5">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Your next opportunity starts with someone who knows the way
              </h2>
              <p className="mx-auto max-w-lg text-sm text-primary-foreground/85 sm:text-base">
                Join {BRAND.name} — referrals, mentorship, and community in one professional network.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="h-12 rounded-full px-8 font-semibold text-foreground transition-transform duration-300 hover:scale-[1.02]"
                asChild
              >
                <Link href="/sign-up">
                  Get started — it&apos;s free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <PublicSiteFooter />
    </div>
  );
}
