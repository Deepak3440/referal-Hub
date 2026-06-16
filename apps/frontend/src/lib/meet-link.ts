/** Client-side check for Google Meet URL format */
export function isValidGoogleMeetLink(url: string): boolean {
  return /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(url.trim());
}
