import { Link } from "wouter";
import { Briefcase, Trophy, Users, Video } from "lucide-react";
import { BRAND } from "@/lib/brand";

export function AuthSplitLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — branding panel */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 xl:p-14 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/30" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/20" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 font-bold text-lg backdrop-blur">
              {BRAND.logoLetter}
            </div>
            <span className="font-bold text-2xl tracking-tight">{BRAND.name}</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <div className="space-y-4">
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight">
              Referrals, mentorship & community
            </h2>
            <p className="text-primary-foreground/85 text-lg leading-relaxed">
              Alumni post openings, guide students 1:1, and share on the feed. Students request referrals and track every step.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Briefcase, label: "Browse jobs", desc: "Find open roles" },
              { icon: Users, label: "Get referred", desc: "Request referrals" },
              { icon: Trophy, label: "Earn points", desc: "Reward every step" },
              { icon: Video, label: "Mentorship", desc: "1:1 consulting" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl bg-white/10 backdrop-blur p-4 border border-white/10"
                >
                  <Icon className="h-5 w-5 mb-2 opacity-90" />
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-primary-foreground/70 mt-0.5">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative z-10 text-sm text-primary-foreground/60">
          Join thousands building careers through warm introductions.
        </p>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 bg-background">
        <div className="lg:hidden mb-8 flex items-center gap-2">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
            {BRAND.logoLetter}
          </div>
          <span className="font-bold text-xl">{BRAND.name}</span>
        </div>

        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
