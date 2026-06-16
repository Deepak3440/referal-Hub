import mongoose from "mongoose";
import { UserModel } from "./models/user";

let isConnected = false;

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI must be set. Did you forget to configure MongoDB?");
  }

  if (isConnected) {
    return;
  }

  await mongoose.connect(mongoUri);
  isConnected = true;

  // Drop legacy Clerk-era indexes that block email/password signups
  try {
    await UserModel.collection.dropIndex("clerkId_1");
  } catch {
    // Index may not exist
  }
  await UserModel.syncIndexes();
  await ensureDefaultUserPoints();
}

/** Give existing users with 0/missing points the configured starting balance (safe, idempotent). */
export async function ensureDefaultUserPoints(): Promise<void> {
  const initial = Number(process.env.INITIAL_USER_POINTS ?? 200);
  if (!Number.isFinite(initial) || initial < 0) return;

  await UserModel.updateMany(
    { $or: [{ totalPoints: { $exists: false } }, { totalPoints: 0 }] },
    { $set: { totalPoints: initial } },
  );
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) {
    return;
  }

  await mongoose.disconnect();
  isConnected = false;
}
