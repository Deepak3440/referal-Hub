import { useListReferrals, getListReferralsQueryKey, type Job } from "@workspace/api-client-react";

/** Reliable referral status for a job — merges job API + my requests list */
export function useMyReferralForJob(jobId: number, job?: Job | null) {
  const { data: myRequests, isLoading } = useListReferrals(
    { role: "requester" },
    { query: { queryKey: getListReferralsQueryKey({ role: "requester" }) } },
  );

  const fromList = myRequests?.find((r) => r.jobId === jobId);
  const fromJob = job?.myReferral ?? null;

  const status =
    fromJob?.status ?? fromList?.status ?? job?.myReferralStatus ?? null;

  return {
    isLoading,
    hasReferral: Boolean(status),
    status: status ?? "pending",
    note: fromJob?.note ?? fromList?.note ?? null,
    createdAt: fromJob?.createdAt ?? fromList?.createdAt,
    pointsPaid: fromJob?.totalPointsDeducted ?? fromList?.totalPointsDeducted ?? 0,
    posterName: fromList?.referrer?.fullName ?? job?.poster?.fullName ?? "Job poster",
  };
}
