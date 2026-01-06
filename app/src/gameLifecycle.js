import { getRedis } from "./redis.js";
import { questions } from "./questions.js";

const START_BUFFER_MS = 3000;

export async function setPendingIfIdle() {
  const redis = getRedis();
  const state = await redis.get("game:state");

  if (state === "IDLE") {
    await redis
      .multi()
      .set("game:state", "PENDING")
      .set("game:totalQuestions", String(questions.length))
      .exec();
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

  const startAt = Date.now() + START_BUFFER_MS;

  await redis
    .multi()
    .set("game:state", "RUNNING")
    .set("game:startAt", String(startAt))
    .set("game:totalQuestions", String(questions.length))
    .set("game:startedBy", adminId)
    .exec();

  return { state: "RUNNING", startAt, totalQuestions: questions.length };
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
    totalQuestions: totalQuestions ? Number(totalQuestions) : questions.length,
  };
}
