/** Configurable referral reward / deduction amounts (override via env). */
export const REWARD_CONFIG = {
  /** Deducted from requester when they send a referral request */
  requestDeductRequester: Number(
    process.env.REWARDS_REQUEST_DEDUCT_REQUESTER
      ?? process.env.REWARDS_ACCEPT_DEDUCT_REFERRER
      ?? 10,
  ),
  /** Credited to job poster when someone requests a referral */
  requestCreditReferrer: Number(
    process.env.REWARDS_REQUEST_CREDIT_REFERRER
      ?? process.env.REWARDS_ACCEPT_CREDIT_REQUESTER
      ?? 10,
  ),
  /** Deducted from requester when poster accepts */
  acceptDeductRequester: Number(
    process.env.REWARDS_ACCEPT_DEDUCT_REQUESTER
      ?? process.env.REWARDS_ACCEPT_DEDUCT_REFERRER
      ?? 10,
  ),
  /** Credited to job poster when they accept */
  acceptCreditReferrer: Number(
    process.env.REWARDS_ACCEPT_CREDIT_REFERRER
      ?? process.env.REWARDS_ACCEPT_CREDIT_REQUESTER
      ?? 20,
  ),
  /** Deducted from requester when marked referred */
  referredDeductRequester: Number(
    process.env.REWARDS_REFERRED_DEDUCT_REQUESTER
      ?? process.env.REWARDS_REFERRED_DEDUCT_REFERRER
      ?? 30,
  ),
  /** Credited to job poster when marked referred */
  referredCreditReferrer: Number(
    process.env.REWARDS_REFERRED_CREDIT_REFERRER
      ?? process.env.REWARDS_REFERRED_DEDUCT_REFERRER
      ?? 30,
  ),
  /** Deducted from requester when marked hired */
  hiredDeductRequester: Number(
    process.env.REWARDS_HIRED_DEDUCT_REQUESTER
      ?? process.env.REWARDS_HIRED_DEDUCT_REFERRER
      ?? 50,
  ),
  /** Credited to job poster when marked hired */
  hiredCreditReferrer: Number(
    process.env.REWARDS_HIRED_CREDIT_REFERRER
      ?? process.env.REWARDS_HIRED_DEDUCT_REFERRER
      ?? 50,
  ),
  /** Starting points for new users */
  initialUserPoints: Number(process.env.INITIAL_USER_POINTS ?? 200),
} as const;

export type ReferralStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "referred"
  | "interviewing"
  | "hired"
  | "rejected_after_interview";

/** Allowed status transitions — only the job poster (referrer) may apply these */
export const REFERRAL_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  pending: ["accepted", "rejected"],
  accepted: ["referred", "rejected"],
  referred: ["interviewing", "rejected"],
  interviewing: ["hired", "rejected_after_interview"],
  rejected: [],
  hired: [],
  rejected_after_interview: [],
};

export const STATUS_LABELS: Record<ReferralStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  referred: "Referred",
  interviewing: "Interviewing",
  hired: "Hired",
  rejected_after_interview: "Not Selected",
};
