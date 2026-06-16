import jwt from "jsonwebtoken";

import { getJwtSecret } from "../config";

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = "7d";

export type JwtPayload = {
  userId: number;
};

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
