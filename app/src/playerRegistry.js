import { getRedis } from "./redis.js";

export async function registerPlayer(sessionToken, playerId) {
  const redis = getRedis();

  await redis.hSet(`player:${sessionToken}`, {
    playerId: String(playerId),
    status: "PENDING",
    qIndex: "0",
    correctCount: "0",
    wrongCount: "0",
  });

  await redis.sAdd("players:active", sessionToken);
}

export async function getPlayerBySession(sessionToken) {
  const redis = getRedis();
  return await redis.hGetAll(`player:${sessionToken}`);
}
