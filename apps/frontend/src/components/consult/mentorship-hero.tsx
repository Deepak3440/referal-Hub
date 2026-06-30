import { Sparkles, Users, CalendarCheck, Star, Building2 } from "lucide-react";
import { MENTORSHIP_STATS } from "@/lib/mentorship-constants";

const ICONS = [Users, CalendarCheck, Star, Building2];

export function MentorshipHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#2563EB]/10 bg-gradient-to-br from-[#EEF2FF] via-[#F8FAFC] to-[#F5F3FF] p-6 sm:p-8">
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#7C3AED]/10 blur-3xl" aria-hidden />
      <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-[#2563EB]/10 blur-3xl" aria-hidden />

      <div className="relative grid gap-8 lg:grid-cols-[1fr_280px] lg:items-center">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2563EB]/20 bg-white/80 px-3 py-1 text-xs font-semibold text-[#2563EB] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Grow faster with alumni guidance
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Learn from alumni who&apos;ve been there.
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Book 1:1 sessions with experienced mentors — interview prep, career switches, and real industry advice.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MENTORSHIP_STATS.map((stat, i) => {
              const Icon = ICONS[i] ?? Users;
              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/80 bg-white/70 px-3 py-3 shadow-sm backdrop-blur-sm"
                >
                  <Icon className="mb-1.5 h-4 w-4 text-[#2563EB]" />
                  <p className="text-sm font-bold text-slate-900">{stat.label}</p>
                  <p className="text-[10px] text-slate-500">{stat.sub}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-center">
          <div className="relative h-48 w-full max-w-[280px] rounded-2xl bg-gradient-to-br from-[#2563EB]/15 to-[#7C3AED]/20 p-6 shadow-inner">
            <div className="absolute inset-4 rounded-xl border border-white/40 bg-white/60 backdrop-blur-sm" />
            <div className="relative flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex -space-x-3">
                {["D", "A", "R"].map((l, i) => (
                  <div
                    key={l}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-md"
                    style={{ background: ["#2563EB", "#7C3AED", "#10B981"][i] }}
                  >
                    {l}
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium text-slate-600">Mentors & mentees connecting daily</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
