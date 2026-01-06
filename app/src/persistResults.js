import { getRedis } from "./redis.js";
import { updatePlayerResult } from "./playerRepo.js";

export async function persistAllPlayersToDb() {
  const redis = getRedis();
  const tokens = await redis.sMembers("players:active");

  for (const token of tokens) {
    const p = await redis.hGetAll(`player:${token}`);
    if (!p || !p.playerId) continue;

    const playerId = Number(p.playerId);
    const correctCount = Number(p.correctCount || 0);
    const wrongCount = Number(p.wrongCount || 0);

    const finishedAt = p.finishedAt ? new Date(Number(p.finishedAt)) : null;
    let durationMs = p.durationMs ? Number(p.durationMs) : null;

    if (!durationMs || durationMs <= 0) {
      const joinedAt = Number(p.joinedAt || 0);
      if (joinedAt > 0) {
        durationMs = Math.max(1, Date.now() - joinedAt);
      }
    }

    await updatePlayerResult({
      playerId,
      correctCount,
      wrongCount,
      finishedAt,
      durationMs,
    });
  }
}
