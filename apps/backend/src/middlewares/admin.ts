import type { Request, Response, NextFunction } from "express";
import { UserModel } from "@workspace/db";

/** Optional extra admins via env (comma-separated user ids). Not required for seeded admin. */
function adminUserIdsFromEnv(): Set<number> {
  const raw = process.env.ADMIN_USER_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0),
  );
}

export async function isAdminUser(userId: number): Promise<boolean> {
  if (adminUserIdsFromEnv().has(userId)) return true;

  const user = await UserModel.findOne({ id: userId })
    .select("isPlatformAdmin")
    .lean();

  return user?.isPlatformAdmin === true;
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = (req as { currentUser?: { id: number } }).currentUser;
  if (!user || !(await isAdminUser(user.id))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
