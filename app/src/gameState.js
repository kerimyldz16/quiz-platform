import { getRedis } from "./redis.js";
import { questions } from "./questions.js";

export async function initGameState() {
  const redis = getRedis();

  const exists = await redis.exists("game:state");
  if (!exists) {
    await redis
      .multi()
      .set("game:state", "IDLE")
      .set("game:totalQuestions", String(questions.length))
      .del("players:active")
      .exec();

    console.log("Game state initialized");
    return;
  }

  // eski state -> totalQuestions yoksa ekle
  const tq = await redis.get("game:totalQuestions");
  if (!tq) {
    await redis.set("game:totalQuestions", String(questions.length));
  }

  console.log("Game state already exists");
}
