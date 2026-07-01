import type { ReferralStatus } from "../lib/rewards";
import { STATUS_LABELS } from "../lib/rewards";
import { createNotification } from "../services/notification.service";
import { referralStatusNotification } from "../services/referral-stats.service";

export async function notifyReferralRequested(params: {
  referrerId: number;
  requesterName: string;
  jobTitle: string;
  referralId: number;
}) {
  await createNotification({
    userId: params.referrerId,
    type: "referral_requested",
    title: "New referral request",
    message: `${params.requesterName} requested a referral for ${params.jobTitle}.`,
    referenceId: params.referralId,
    referenceType: "referral",
    linkPath: "/referrals",
  });
}

export async function notifyReferralStatusChange(params: {
  requesterId: number;
  referrerName: string;
  jobTitle: string;
  status: ReferralStatus;
  referralId: number;
}) {
  const meta = referralStatusNotification(params.status);
  await createNotification({
    userId: params.requesterId,
    type: meta.type,
    title: meta.title,
    message: `${params.referrerName} updated your referral for ${params.jobTitle} to ${STATUS_LABELS[params.status]}.`,
    referenceId: params.referralId,
    referenceType: "referral",
    linkPath: "/referrals",
  });
}

export async function notifyNewMessage(params: {
  recipientId: number;
  senderName: string;
  conversationId: string;
  preview: string;
}) {
  await createNotification({
    userId: params.recipientId,
    type: "new_message",
    title: "New message",
    message: `${params.senderName}: ${params.preview.slice(0, 120)}`,
    referenceId: null,
    referenceType: "conversation",
    linkPath: `/messages?c=${encodeURIComponent(params.conversationId)}`,
  });
}

export async function notifyMentorshipBooking(params: {
  consultantId: number;
  requesterName: string;
  consultationId: number;
}) {
  await createNotification({
    userId: params.consultantId,
    type: "mentorship_booking",
    title: "Mentorship request",
    message: `${params.requesterName} requested a 1:1 mentorship session.`,
    referenceId: params.consultationId,
    referenceType: "consultation",
    linkPath: "/consult?tab=sessions",
  });
}

export async function notifyMentorshipUpdate(params: {
  requesterId: number;
  consultantName: string;
  consultationId: number;
  status: "scheduled" | "rejected";
}) {
  const isScheduled = params.status === "scheduled";
  await createNotification({
    userId: params.requesterId,
    type: isScheduled ? "mentorship_scheduled" : "mentorship_rejected",
    title: isScheduled ? "Session scheduled" : "Mentorship declined",
    message: isScheduled
      ? `${params.consultantName} scheduled your mentorship session.`
      : `${params.consultantName} declined your mentorship request.`,
    referenceId: params.consultationId,
    referenceType: "consultation",
    linkPath: "/consult?tab=sessions",
  });
}

export async function notifyMentorshipSessionConfirmed(params: {
  consultantId: number;
  requesterId: number;
  requesterName: string;
  consultantName: string;
  consultationId: number;
  scheduledAt: string;
  meetingLink: string;
}) {
  const when = params.scheduledAt
    ? new Date(params.scheduledAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "soon";

  await Promise.all([
    createNotification({
      userId: params.consultantId,
      type: "mentorship_scheduled",
      title: "New session booked",
      message: `${params.requesterName} booked a session on ${when}.`,
      referenceId: params.consultationId,
      referenceType: "consultation",
      linkPath: "/consult?tab=sessions",
    }),
    createNotification({
      userId: params.requesterId,
      type: "mentorship_scheduled",
      title: "Session confirmed",
      message: `Your session with ${params.consultantName} is confirmed for ${when}. Join from My Sessions.`,
      referenceId: params.consultationId,
      referenceType: "consultation",
      linkPath: "/consult?tab=sessions",
    }),
  ]);
}

export async function notifyPostLike(params: {
  authorId: number;
  likerName: string;
  postId: number;
}) {
  await createNotification({
    userId: params.authorId,
    type: "post_like",
    title: "Post liked",
    message: `${params.likerName} liked your post.`,
    referenceId: params.postId,
    referenceType: "post",
    linkPath: "/feed",
  });
}

export async function notifyPostComment(params: {
  authorId: number;
  commenterName: string;
  postId: number;
  commentId: number;
  preview: string;
}) {
  await createNotification({
    userId: params.authorId,
    type: "post_comment",
    title: "New comment",
    message: `${params.commenterName}: ${params.preview.slice(0, 120)}`,
    referenceId: params.commentId,
    referenceType: "post_comment",
    linkPath: "/feed",
  });
}
