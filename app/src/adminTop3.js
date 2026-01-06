import { getRedis } from "./redis.js";
import { getGameState } from "./gameLifecycle.js";

export async function getTop3AllCorrectFastest() {
  const redis = getRedis();
  const gs = await getGameState();
  const total = Number(gs.totalQuestions || 0);

  const tokens = await redis.sMembers("players:active");
  const rows = [];

  for (const token of tokens) {
    const p = await redis.hGetAll(`player:${token}`);
    if (!p || !p.playerId) continue;

    const correct = Number(p.correctCount || 0);
    const wrong = Number(p.wrongCount || 0);
    const dur = p.durationMs ? Number(p.durationMs) : null;

    if (
      p.status === "DONE" &&
      wrong === 0 &&
      correct === total &&
      dur !== null
    ) {
      rows.push({
        playerId: Number(p.playerId),
        durationMs: dur,
      });
    }
  }

  rows.sort((a, b) => a.durationMs - b.durationMs);
  return rows.slice(0, 3);
}
