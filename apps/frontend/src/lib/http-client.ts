import { ApiError, customFetch } from "@workspace/api-client-react";

/**
 * Shared HTTP client for endpoints not yet in the OpenAPI spec
 * (auth, feed, consultations). Uses the same token + fetch stack as
 * generated React Query hooks via customFetch.
 */
export class HttpError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function toMessage(err: ApiError): string {
  const data = err.data as { error?: string; message?: string } | null;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  return err.message;
}

function toHttpError(err: unknown): HttpError {
  if (err instanceof ApiError) {
    return new HttpError(toMessage(err), err.status);
  }
  if (err instanceof Error) return new HttpError(err.message);
  return new HttpError("Request failed");
}

export async function httpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await customFetch<T>(`/api${path}`, options);
  } catch (err) {
    throw toHttpError(err);
  }
}
