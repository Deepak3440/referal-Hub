import { Link } from "wouter";
import { Mail, MessageCircle, Clock } from "lucide-react";
import { PublicPageLayout } from "@/components/layout/public-site-layout";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";

const TOPICS = [
  {
    title: "Account & login",
    description: "Sign-in issues, email verification, or profile updates.",
  },
  {
    title: "Referrals",
    description: "Questions about requesting, offering, or tracking referrals.",
  },
  {
    title: "Mentorship",
    description: "Booking sessions, scheduling, or mentor profiles.",
  },
  {
    title: "Safety & reporting",
    description: "Report inappropriate behaviour or content on the platform.",
  },
] as const;

export default function ContactPage() {
  return (
    <PublicPageLayout
      title="Contact us"
      subtitle={`We're here to help you get the most out of ${BRAND.name}.`}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${BRAND.supportEmail}`}
            className="group rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-colors hover:border-primary/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-semibold group-hover:text-primary transition-colors">Email support</h2>
            <p className="mt-1 text-sm text-muted-foreground">{BRAND.supportEmail}</p>
            <p className="mt-3 text-xs text-muted-foreground">Best for account, referral, or technical questions.</p>
          </a>

          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-semibold">Response time</h2>
            <p className="mt-1 text-sm text-muted-foreground">We aim to reply within 1–2 business days.</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Include your registered email and a short description of the issue.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2 text-foreground font-medium mb-4">
            <MessageCircle className="h-4 w-4 text-primary" />
            Common topics
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {TOPICS.map((topic) => (
              <li
                key={topic.title}
                className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
              >
                <p className="text-sm font-medium">{topic.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {topic.description}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            New to {BRAND.name}?{" "}
            <Link href="/sign-up" className="font-medium text-primary hover:underline">
              Create a free account
            </Link>{" "}
            or read our{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline">
              Terms &amp; Conditions
            </Link>
            .
          </p>
          <Button className="mt-5 rounded-full" asChild>
            <a href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(`${BRAND.name} support`)}`}>
              <Mail className="mr-2 h-4 w-4" />
              Send us an email
            </a>
          </Button>
        </div>
      </div>
    </PublicPageLayout>
  );
}
