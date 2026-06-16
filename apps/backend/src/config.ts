const DEV_JWT_FALLBACK = "dev-secret-change-in-production";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || secret === DEV_JWT_FALLBACK) {
    if (isProduction()) {
      throw new Error("JWT_SECRET must be set to a strong random value in production.");
    }
    return DEV_JWT_FALLBACK;
  }

  return secret;
}

export function getCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim() || process.env.FRONTEND_URL?.trim();
  if (!raw) {
    return isProduction() ? false : true;
  }
  const origins = raw.split(",").map((o) => o.trim()).filter(Boolean);
  return origins.length === 1 ? origins[0]! : origins;
}
