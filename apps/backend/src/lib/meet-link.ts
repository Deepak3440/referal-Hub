/** Valid Google Meet URL: https://meet.google.com/abc-defg-hij */
const MEET_URL_RE = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;

export function isValidGoogleMeetLink(url: string): boolean {
  return MEET_URL_RE.test(url.trim());
}

export function normalizeGoogleMeetLink(url: string): string {
  const trimmed = url.trim();
  if (!isValidGoogleMeetLink(trimmed)) {
    throw new Error(
      "Invalid Google Meet link. Open meet.google.com/new, create a meeting, and paste the full link (e.g. https://meet.google.com/abc-defg-hij).",
    );
  }
  return trimmed.toLowerCase();
}
