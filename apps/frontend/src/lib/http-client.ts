import { ApiError, customFetch } from "@workspace/api-client-react";

/**
 * Shared HTTP client for endpoints not yet in the OpenAPI spec
 * (auth, feed, consultations). Uses the same token + fetch stack as
 * generated React Query hooks via customFetch.
 */
export class HttpError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly data?: Record<string, unknown>;

  constructor(
    message: string,
    status?: number,
    extras?: { code?: string; data?: Record<string, unknown> },
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = extras?.code;
    this.data = extras?.data;
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
    if (err.status === 413) {
      return new HttpError(
        "Photo upload is too large for the server. Try a smaller image (under 2 MB), or ask your admin to increase the nginx upload limit.",
        err.status,
      );
    }
    const data = err.data as
      | { error?: string; message?: string; code?: string; email?: string }
      | null;
    return new HttpError(toMessage(err), err.status, {
      code: typeof data?.code === "string" ? data.code : undefined,
      data: data ?? undefined,
    });
  }
  if (err instanceof Error) return new HttpError(err.message);
  return new HttpError("Request failed");
}

export async function httpRequestPublic<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("content-type") && options.body) {
    headers.set("content-type", "application/json");
  }
  headers.delete("authorization");

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  if (!res.ok) {
    throw new HttpError(data?.error ?? data?.message ?? "Request failed", res.status, {
      data: data ?? undefined,
    });
  }
  return data as T;
}

export async function httpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await customFetch<T>(`/api${path}`, options);
  } catch (err) {
    throw toHttpError(err);
  }
}
