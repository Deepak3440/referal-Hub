const DEFAULT_JITSI_DOMAIN = "meet.jit.si";

export function jitsiDomain(): string {
  const raw = process.env.JITSI_DOMAIN?.trim();
  return raw || DEFAULT_JITSI_DOMAIN;
}

export function buildJitsiRoomName(consultationId: number): string {
  return `referaa-session-${consultationId}`;
}

export function buildJitsiMeetingLink(consultationId: number): string {
  const room = buildJitsiRoomName(consultationId);
  return `https://${jitsiDomain()}/${room}`;
}

export type ConsultationMeeting = {
  videoProvider: "jitsi";
  roomName: string;
  meetingLink: string;
};

/** Generate Jitsi room URL for a consultation (no external API call). */
export function createConsultationMeeting(consultationId: number): ConsultationMeeting {
  const roomName = buildJitsiRoomName(consultationId);
  return {
    videoProvider: "jitsi",
    roomName,
    meetingLink: buildJitsiMeetingLink(consultationId),
  };
}

export function isMentorshipPaymentEnabled(): boolean {
  const raw = process.env.MENTORSHIP_PAYMENT_ENABLED;
  if (raw == null || raw === "") return true;
  return raw === "true" || raw === "1";
}
