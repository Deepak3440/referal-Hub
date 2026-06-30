import { Calendar, Heart, Shield, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BENEFITS = [
  {
    icon: Sparkles,
    title: "1:1 Personalised guidance",
    desc: "Get advice tailored to your goals, resume, and target roles.",
  },
  {
    icon: Users,
    title: "Learn from top alumni",
    desc: "Mentors from leading companies and your college network.",
  },
  {
    icon: Calendar,
    title: "Flexible scheduling",
    desc: "Book sessions that fit your calendar — 30 to 60 minutes.",
  },
  {
    icon: Shield,
    title: "Secure & private",
    desc: "Your conversations stay between you and your mentor.",
  },
] as const;

export function MentorshipInfoPanel({ onRefer }: { onRefer?: () => void }) {
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Why book a session?</h3>
        <ul className="mt-4 space-y-4">
          {BENEFITS.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF]">
                <item.icon className="h-4 w-4 text-[#2563EB]" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="text-xs leading-relaxed text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={cn(
          "rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/10 to-[#2563EB]/10 p-5",
        )}
      >
        <div className="flex items-start gap-2">
          <Heart className="h-5 w-5 text-[#7C3AED] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-900">Refer & earn rewards</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Invite friends to Referaa and earn points when they join and engage.
            </p>
            {onRefer && (
              <Button
                type="button"
                size="sm"
                className="mt-3 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-sm"
                onClick={onRefer}
              >
                Refer now
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
