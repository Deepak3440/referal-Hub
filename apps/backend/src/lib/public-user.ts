import {
  UserModel,
  publiclyVisibleUserFilter,
  isUserPubliclyVisible,
  toUserProfile,
  type UserDoc,
} from "@workspace/db";

export async function findPublicUserById(userId: number) {
  return UserModel.findOne({ id: userId, ...publiclyVisibleUserFilter }).lean();
}

export async function findPublicUsersByIds(userIds: number[]) {
  if (userIds.length === 0) return [];
  return UserModel.find({ id: { $in: userIds }, ...publiclyVisibleUserFilter }).lean();
}

export function toPublicUserProfile(user: UserDoc | null | undefined) {
  if (!isUserPubliclyVisible(user)) return null;
  return toUserProfile(user ?? null);
}
