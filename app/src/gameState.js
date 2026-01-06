import { getRedis } from "./redis.js";

export async function initGameState() {
  const redis = getRedis();
  const exists = await redis.exists("game:state");
  if (!exists) {
    await redis.set("game:state", "IDLE");
    await redis.set("game:question", 0);
    console.log("Game state initialized");
  } else {
    console.log("Game state already exists");
  }
}
