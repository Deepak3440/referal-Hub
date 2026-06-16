import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, CreditCard, Gift, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardCard } from "@/components/layout/page-header";
import { useToast } from "@/hooks/use-toast";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import {
  pointsPurchaseApi,
  POINTS_PURCHASE_QUERY_KEY,
  type PointsPackage,
} from "@/lib/points-purchase-api";
import { cn } from "@/lib/utils";

type AddPointsCardProps = {
  balance: number;
};

function formatPts(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
}

export function AddPointsCard({ balance }: AddPointsCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PointsPackage | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: POINTS_PURCHASE_QUERY_KEY,
    queryFn: () => pointsPurchaseApi.getPackages(),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading || !data?.enabled || data.packages.length === 0) return null;

  const cols =
    data.packages.length >= 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : data.packages.length === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";

  const handlePay = async () => {
    if (!selected) return;
    setPurchasing(true);
    try {
      const result = await pointsPurchaseApi.purchase(selected.id);
      queryClient.setQueryData(getGetMeQueryKey(), (old: { totalPoints?: number } | undefined) =>
        old ? { ...old, totalPoints: result.totalPoints } : old,
      );
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setPayOpen(false);
      setSelected(null);
      const bonusLine =
        result.bonusPoints > 0 ? ` (incl. +${result.bonusPoints} bonus)` : "";
      toast({
        title: `+${result.pointsAdded} points added${bonusLine}`,
        description: `Balance: ${result.totalPoints} pts · Simulated payment`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not add points",
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <>
      <DashboardCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Add points
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Bigger packs include bonus points — more value per ₹. Simulated payment for now.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Balance </span>
            <span className="font-bold tabular-nums">{balance} pts</span>
          </div>
        </div>

        <div className={cn("grid gap-3", cols)}>
          {data.packages.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => {
                setSelected(pkg);
                setPayOpen(true);
              }}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm",
                pkg.popular && "border-primary/40 bg-primary/[0.03]",
              )}
            >
              {pkg.popular && (
                <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                  Popular
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {pkg.label}
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {formatPts(pkg.totalPoints)} pts
              </p>
              {pkg.bonusPoints > 0 && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  {formatPts(pkg.points)} + {pkg.bonusPoints} bonus
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(pkg.bonusPercent ?? 0) > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    +{pkg.bonusPercent}% bonus
                  </Badge>
                )}
                {pkg.valueBonusPercent > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300/60 text-emerald-700 dark:text-emerald-400">
                    {pkg.valueBonusPercent}% better value
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Pay ₹{pkg.priceInr}
              </p>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed hidden sm:block">
          Add more tiers in <code className="text-[10px]">POINTS_PURCHASE_PACKAGES</code> — set higher{" "}
          <code className="text-[10px]">bonusPercent</code> on larger packs for extra discount points.
        </p>
      </DashboardCard>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm purchase</DialogTitle>
            <DialogDescription>
              {selected ? (
                <>
                  You get <strong>{selected.totalPoints} points</strong> for{" "}
                  <strong>₹{selected.priceInr}</strong>
                  {selected.bonusPoints > 0 && (
                    <>
                      {" "}
                      (includes <strong>+{selected.bonusPoints} bonus</strong>)
                    </>
                  )}
                  . Simulated — no real charge.
                </>
              ) : (
                "Select a package"
              )}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Package</span>
                <span className="font-medium">{selected.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base points</span>
                <span className="font-medium tabular-nums">{selected.points}</span>
              </div>
              {selected.bonusPoints > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Bonus (+{selected.bonusPercent}%)</span>
                  <span className="font-medium tabular-nums">+{selected.bonusPoints}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>You receive</span>
                <span className="tabular-nums">{selected.totalPoints} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">₹{selected.priceInr}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">New balance</span>
                <span className="font-semibold tabular-nums">{balance + selected.totalPoints} pts</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={purchasing}>
              Cancel
            </Button>
            <Button onClick={handlePay} disabled={!selected || purchasing}>
              {purchasing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing…
                </>
              ) : (
                <>Pay ₹{selected?.priceInr ?? 0}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
