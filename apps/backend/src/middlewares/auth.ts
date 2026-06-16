import { type Request, type Response, type NextFunction } from "express";
import { UserModel, toUserProfile } from "@workspace/db";
import { verifyToken } from "../lib/jwt";
import { logger } from "../lib/logger";

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const user = await UserModel.findOne({ id: payload.userId }).lean();
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    (req as any).currentUser = toUserProfile(user);
    next();
  } catch (err) {
    logger.error({ err }, "Error in requireAuth middleware");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = getBearerToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const user = await UserModel.findOne({ id: payload.userId }).lean();
      if (user) {
        (req as any).currentUser = toUserProfile(user);
      }
    }
  }
  next();
}
