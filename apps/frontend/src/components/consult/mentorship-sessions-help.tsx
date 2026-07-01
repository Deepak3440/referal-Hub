import { Info } from "lucide-react";

export function MentorshipSessionsHelp() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 space-y-2">
      <p className="font-semibold text-slate-900 flex items-center gap-2">
        <Info className="h-4 w-4 text-primary shrink-0" />
        Cancel vs report an issue
      </p>
      <ul className="text-xs space-y-1.5 list-disc pl-4 text-slate-600">
        <li>
          <strong>Cancel</strong> — only before the session goes <strong>Live</strong> (before mentor
          joins). No points charged if you cancel early; charged points refunded if mentor had not
          been paid yet.
        </li>
        <li>
          <strong>Live sessions</strong> — cancel is hidden. Finish the call, then{" "}
          <strong>Mark complete</strong> so the mentor gets paid.
        </li>
        <li>
          <strong>Report issue</strong> (students only) — after points are charged and something went
          wrong (short call, no-show, etc.). Admin reviews at{" "}
          <code className="text-[10px] bg-white px-1 rounded">/admin/mentorship</code>.
        </li>
      </ul>
    </div>
  );
}
