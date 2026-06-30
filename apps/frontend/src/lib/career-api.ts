import { httpRequestPublic } from "@/lib/http-client";

export type CareerSearchResult = {
  items: string[];
  query: string;
};

export async function searchCompanies(query: string, limit = 12): Promise<CareerSearchResult> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set("q", query.trim());
  return httpRequestPublic<CareerSearchResult>(`/career/companies?${params}`);
}

export async function searchRoles(query: string, limit = 12): Promise<CareerSearchResult> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set("q", query.trim());
  return httpRequestPublic<CareerSearchResult>(`/career/roles?${params}`);
}

export async function searchLocations(query: string, limit = 12): Promise<CareerSearchResult> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set("q", query.trim());
  return httpRequestPublic<CareerSearchResult>(`/career/locations?${params}`);
}

export async function searchColleges(query: string, limit = 12): Promise<CareerSearchResult> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set("q", query.trim());
  return httpRequestPublic<CareerSearchResult>(`/career/colleges?${params}`);
}
