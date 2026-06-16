import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateReferral,
  getGetJobQueryKey,
  getGetMeQueryKey,
  getListReferralsQueryKey,
  getListJobReferralsQueryKey,
  getGetDashboardStatsQueryKey,
  type Job,
  type Referral,
} from "@workspace/api-client-react";
import type { PointsUpdate } from "@/hooks/use-sync-points";

type ReferralResponse = Referral & { pointsUpdate?: PointsUpdate };

/** Send referral request and immediately update caches so UI shows Pending */
export function useSubmitReferral(jobId: number) {
  const queryClient = useQueryClient();
  const createReferral = useCreateReferral();

  const submit = useCallback(
    async (note: string): Promise<ReferralResponse> => {
      const referral = (await createReferral.mutateAsync({
        data: { jobId, note },
      })) as ReferralResponse;

      const pu = referral.pointsUpdate;
      if (pu) {
        queryClient.setQueryData(getGetMeQueryKey(), (old: { id: number; totalPoints: number } | undefined) => {
          if (!old) return old;
          if (old.id === pu.requesterId) return { ...old, totalPoints: pu.requesterPoints };
          if (old.id === pu.referrerId) return { ...old, totalPoints: pu.referrerPoints };
          return old;
        });
      }

      const patchJob = (old: Job | undefined): Job | undefined => {
        if (!old) return old;
        return {
          ...old,
          myReferralStatus: referral.status,
          myReferral: {
            id: referral.id,
            status: referral.status,
            note: referral.note ?? null,
            totalPointsCredited: referral.totalPointsCredited ?? 0,
            totalPointsDeducted: referral.totalPointsDeducted ?? 0,
            createdAt: referral.createdAt,
            updatedAt: referral.updatedAt,
          },
          referralCount: old.referralCount + (old.myReferralStatus ? 0 : 1),
        };
      };

      queryClient.setQueryData(getGetJobQueryKey(jobId), patchJob);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListReferralsQueryKey({ role: "requester" }) }),
        queryClient.invalidateQueries({ queryKey: getListReferralsQueryKey({ role: "referrer" }) }),
        queryClient.invalidateQueries({ queryKey: getListJobReferralsQueryKey(jobId) }),
        queryClient.invalidateQueries({ queryKey: ["/api/jobs/my"] }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: ["/api/jobs"] }),
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
        queryClient.refetchQueries({ queryKey: getGetJobQueryKey(jobId) }),
      ]);

      return referral;
    },
    [createReferral, jobId, queryClient],
  );

  return { submit, isPending: createReferral.isPending };
}
