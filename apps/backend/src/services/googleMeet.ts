import { normalizeGoogleMeetLink } from "../lib/meet-link";

type CreateMeetParams = {
  consultationId: number;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  consultantEmail?: string | null;
  requesterEmail?: string | null;
};

function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID
    && process.env.GOOGLE_CLIENT_SECRET
    && process.env.GOOGLE_REFRESH_TOKEN,
  );
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error ?? "Failed to authenticate with Google Calendar");
  }
  return data.access_token;
}

/** Create a real Google Calendar event with an official Google Meet link */
export async function createGoogleMeetLink(params: CreateMeetParams): Promise<string> {
  if (!isConfigured()) {
    throw new Error("GOOGLE_NOT_CONFIGURED");
  }

  const token = await getAccessToken();
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";
  const end = new Date(params.scheduledAt.getTime() + params.durationMinutes * 60_000);
  const timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE ?? "UTC";

  const attendees = [params.consultantEmail, params.requesterEmail]
    .filter((e): e is string => Boolean(e))
    .map((email) => ({ email }));

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: params.title,
        description: "1:1 consulting session created via Referral-Hub",
        start: { dateTime: params.scheduledAt.toISOString(), timeZone },
        end: { dateTime: end.toISOString(), timeZone },
        attendees,
        conferenceData: {
          createRequest: {
            requestId: `referaa-consult-${params.consultationId}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );

  const event = (await res.json()) as {
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(event.error?.message ?? "Failed to create Google Calendar event");
  }

  const link =
    event.hangoutLink
    ?? event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;

  if (!link) {
    throw new Error("Google Calendar event created but no Meet link was returned");
  }

  return normalizeGoogleMeetLink(link);
}

export function isGoogleMeetAutoCreateEnabled(): boolean {
  return isConfigured();
}
