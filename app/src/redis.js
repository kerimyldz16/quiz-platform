import { createClient } from "redis";

let redis = null;

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getRedis() {
  if (!redis) throw new Error("Redis client not connected");
  return redis;
}

export async function connectRedis() {
  const redisUrl = mustGetEnv("REDIS_URL");

  redis = createClient({
    url: redisUrl,
  });

  redis.on("error", (err) => {
    console.error("Redis error:", err?.message || err);
  });
  await redis.connect();
  console.log(`Redis connected: ${redisUrl}`);
}
