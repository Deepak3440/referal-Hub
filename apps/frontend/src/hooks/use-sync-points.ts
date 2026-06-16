import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, getGetDashboardStatsQueryKey, type UserProfile } from "@workspace/api-client-react";

export type PointsUpdate = {
  referrerId: number;
  referrerPoints: number;
  requesterId: number;
  requesterPoints: number;
};

export function useSyncPoints() {
  const queryClient = useQueryClient();

  return async (pointsUpdate?: PointsUpdate | null) => {
    if (pointsUpdate) {
      queryClient.setQueryData(getGetMeQueryKey(), (old: UserProfile | undefined) => {
        if (!old) return old;
        if (old.id === pointsUpdate.referrerId) {
          return { ...old, totalPoints: pointsUpdate.referrerPoints };
        }
        if (old.id === pointsUpdate.requesterId) {
          return { ...old, totalPoints: pointsUpdate.requesterPoints };
        }
        return old;
      });
    }
    await queryClient.refetchQueries({ queryKey: getGetMeQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  };
}
