import type { UserProfile } from "@workspace/api-client-react";
import { httpRequest } from "@/lib/http-client";

export async function uploadProfileAvatar(data: string, mimeType: string): Promise<UserProfile> {
  return httpRequest<UserProfile>("/users/me/avatar", {
    method: "POST",
    body: JSON.stringify({ data, mimeType }),
  });
}

export async function deleteMyAccount(confirmEmail: string): Promise<void> {
  await httpRequest<void>("/users/me", {
    method: "DELETE",
    body: JSON.stringify({ confirmEmail }),
  });
}
