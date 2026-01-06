import { getRedis } from "./redis.js";
import { refreshQuestionsFromDbToSnapshot } from "./questionStore.js";

const START_BUFFER_MS = 3000;

export async function setPendingIfIdle() {
  const redis = getRedis();
  const state = await redis.get("game:state");

  if (state === "IDLE") {
    await redis.set("game:state", "PENDING");
    return true;
  }
  return false;
}

export async function startGame(adminId = "admin") {
  const redis = getRedis();
  const state = await redis.get("game:state");

  if (state !== "PENDING") {
    throw new Error("Game cannot be started from this state");
  }

  const totalQuestions = await refreshQuestionsFromDbToSnapshot();
  if (!totalQuestions || totalQuestions < 1) {
    throw new Error("No questions in database");
  }

  const startAt = Date.now() + START_BUFFER_MS;

  await redis
    .multi()
    .set("game:state", "RUNNING")
    .set("game:startAt", String(startAt))
    .set("game:totalQuestions", String(totalQuestions))
    .set("game:startedBy", adminId)
    .exec();

  return { state: "RUNNING", startAt, totalQuestions };
}

export async function endGame(adminId = "admin") {
  const redis = getRedis();
  const state = await redis.get("game:state");

  if (state !== "RUNNING") {
    throw new Error("Game cannot be ended from this state");
  }

  await redis
    .multi()
    .set("game:state", "FINISHED")
    .set("game:endedBy", adminId)
    .exec();

  return { state: "FINISHED" };
}

export async function getGameState() {
  const redis = getRedis();
  const [state, startAt, totalQuestions] = await redis.mGet(
    "game:state",
    "game:startAt",
    "game:totalQuestions"
  );

  return {
    state,
    startAt: startAt ? Number(startAt) : null,
    totalQuestions: totalQuestions ? Number(totalQuestions) : null,
  };
}
export async function resetGame() {
  const redis = getRedis();

  // aktif oyuncu token'larını al
  const tokens = await redis.sMembers("players:active");

  const multi = redis.multi();

  // global game keys reset
  multi.set("game:state", "IDLE");
  multi.del(
    "game:startAt",
    "game:totalQuestions",
    "game:startedBy",
    "game:endedBy",
    "game:questions" // snapshot
  );

  // players set reset
  multi.del("players:active");

  // player hash'lerini temizle (yeni oyun için eski tokenlarla devam edilmesin)
  for (const t of tokens) {
    multi.del(`player:${t}`);
  }

  await multi.exec();

  return { state: "IDLE" };
}
