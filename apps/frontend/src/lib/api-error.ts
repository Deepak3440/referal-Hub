/** Extract user-facing message from API client errors */
export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { error?: string; message?: string } }).data;
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
