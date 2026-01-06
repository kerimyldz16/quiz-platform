import { getRedis } from "./redis.js";

export async function registerPlayer(sessionToken, playerId) {
  const redis = getRedis();
  await redis.hSet(`player:${sessionToken}`, {
    playerId: String(playerId),
    status: "PENDING",
  });
  await redis.sAdd("players:active", sessionToken);
}
