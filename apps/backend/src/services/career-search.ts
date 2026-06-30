import careerData from "../data/career-options.json";

const companies = careerData.companies as string[];
const roles = careerData.roles as string[];
const locations = careerData.locations as string[];
const colleges = careerData.colleges as string[];

const POPULAR_COMPANY_COUNT = 12;
const POPULAR_ROLE_COUNT = 10;
const POPULAR_LOCATION_COUNT = 10;
const POPULAR_COLLEGE_COUNT = 12;

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function rankMatches(items: string[], query: string): string[] {
  const q = normalizeQuery(query);
  if (!q) return items;

  return items
    .filter((item) => item.toLowerCase().includes(q))
    .sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStarts = aLower.startsWith(q) ? 0 : 1;
      const bStarts = bLower.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.localeCompare(b);
    });
}

export function searchCompanies(query: string, limit = 12): string[] {
  const q = normalizeQuery(query);
  if (!q) {
    return companies.slice(0, Math.min(limit, POPULAR_COMPANY_COUNT));
  }
  return rankMatches(companies, q).slice(0, limit);
}

export function searchRoles(query: string, limit = 12): string[] {
  const q = normalizeQuery(query);
  if (!q) {
    return roles.slice(0, Math.min(limit, POPULAR_ROLE_COUNT));
  }
  return rankMatches(roles, q).slice(0, limit);
}

export function searchLocations(query: string, limit = 12): string[] {
  const q = normalizeQuery(query);
  if (!q) {
    return locations.slice(0, Math.min(limit, POPULAR_LOCATION_COUNT));
  }
  return rankMatches(locations, q).slice(0, limit);
}

export function searchColleges(query: string, limit = 12): string[] {
  const q = normalizeQuery(query);
  if (!q) {
    return colleges.slice(0, Math.min(limit, POPULAR_COLLEGE_COUNT));
  }
  return rankMatches(colleges, q).slice(0, limit);
}

/** For future: move lists to MongoDB when you have 5k+ entries and admin CRUD */
export function careerCatalogStats() {
  return {
    companies: companies.length,
    roles: roles.length,
    locations: locations.length,
    colleges: colleges.length,
    storage: "json",
  };
}
