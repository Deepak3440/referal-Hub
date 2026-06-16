import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetMe, useListReferrals, getListReferralsQueryKey } from "@workspace/api-client-react";
import {
  buildPipelineBreakdown,
  computeReferralPointsSnapshot,
  isActiveReferralStatus,
  referralPointsHint,
  setRewardsConfig,
  type RewardsConfig,
} from "@/lib/referral-points";

async function fetchRewardsConfig(): Promise<RewardsConfig> {
  const res = await fetch("/api/config/rewards");
  if (!res.ok) throw new Error("Failed to load rewards config");
  return res.json() as Promise<RewardsConfig>;
}

/** Client-side points guard — uses job.rewardPoints % schedule from server config */
export function useCanAffordReferral(jobRewardPoints = 0) {
  const { data: config } = useQuery({
    queryKey: ["/api/config/rewards"],
    queryFn: fetchRewardsConfig,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (config) setRewardsConfig(config);
  }, [config]);

  const { data: me } = useGetMe();
  const { data: myRequests } = useListReferrals(
    { role: "requester" },
    { query: { queryKey: getListReferralsQueryKey({ role: "requester" }) } },
  );

  const activeReferrals = useMemo(
    () =>
      (myRequests ?? [])
        .filter((r) => isActiveReferralStatus(r.status))
        .map((r) => ({
          rewardPoints: r.job?.rewardPoints ?? jobRewardPoints,
          rewardStagesApplied: r.rewardStagesApplied ?? [],
        })),
    [myRequests, jobRewardPoints],
  );

  const snapshot = useMemo(
    () => computeReferralPointsSnapshot(me?.totalPoints ?? 0, activeReferrals, jobRewardPoints),
    [me?.totalPoints, activeReferrals, jobRewardPoints, config],
  );

  const pipeline = useMemo(
    () => (jobRewardPoints > 0 ? buildPipelineBreakdown(jobRewardPoints) : []),
    [jobRewardPoints, config],
  );

  return {
    snapshot,
    canAfford: snapshot.canSend,
    hint: referralPointsHint(snapshot),
    balance: me?.totalPoints ?? 0,
    pipeline,
    pointsEnabled: snapshot.pointsEnabled,
  };
}
