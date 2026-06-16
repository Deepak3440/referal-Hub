export function buildConversationId(userIdA: number, userIdB: number): string {
  const [a, b] = userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
  return `${a}_${b}`;
}
