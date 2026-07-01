import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { consultApi, CONSULT_QUERY_KEYS } from "@/lib/consult-api";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Flag, ShieldCheck } from "lucide-react";

export default function AdminMentorshipPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<number, string>>({});

  const { data: disputes, isLoading, error } = useQuery({
    queryKey: CONSULT_QUERY_KEYS.disputes,
    queryFn: () => consultApi.listOpenDisputes(),
    retry: false,
  });

  const resolveMutation = useMutation({
    mutationFn: (args: {
      id: number;
      resolution: "refund" | "mentor" | "dismiss";
    }) =>
      consultApi.resolveDispute(args.id, {
        resolution: args.resolution,
        adminNote: notes[args.id]?.trim() || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Dispute resolved" });
      queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.disputes });
      queryClient.invalidateQueries({ queryKey: CONSULT_QUERY_KEYS.list("all") });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-3">
        <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="font-medium">Admin access required</p>
        <p className="text-sm text-muted-foreground">
          Sign in with the platform admin account (<code className="text-xs">admin@referaa.com</code>
          ). Run <code className="text-xs">pnpm seed:admin</code> if the account is missing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Mentorship disputes"
        description="Review student complaints after a live session. Decide refund, pay mentor, or dismiss."
      />

      {isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : !disputes?.length ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Flag className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No open disputes
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => {
            const pts = d.amountPoints || d.amountInr;
            return (
              <article key={d.id} className="rounded-xl border bg-card p-4 sm:p-5 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      Session #{d.id} · {pts} pts
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {d.requester?.fullName} → {d.consultant?.fullName}
                    </p>
                    {d.scheduledAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(d.scheduledAt), "MMM d, yyyy · h:mm a")} · status:{" "}
                        {d.status}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="border-amber-500 text-amber-800">
                    Open
                  </Badge>
                </div>

                <blockquote className="text-sm rounded-lg bg-muted/50 border px-3 py-2.5">
                  {d.disputeReason}
                </blockquote>

                <Textarea
                  rows={2}
                  placeholder="Admin note (optional, visible internally)"
                  value={notes[d.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate({ id: d.id, resolution: "refund" })}
                  >
                    Refund student ({pts} pts)
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full"
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate({ id: d.id, resolution: "mentor" })}
                  >
                    Pay mentor ({pts} pts)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate({ id: d.id, resolution: "dismiss" })}
                  >
                    Dismiss · pay mentor
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
