import { createClient } from "redis";

let redis = null;

export function getRedis() {
  if (!redis) throw new Error("Redis client not connected");
  return redis;
}

export async function connectRedis() {
  const host = process.env.REDIS_HOST || "redis";
  const port = Number(process.env.REDIS_PORT || 6379);

  // Client'ı burada yarat: import-time değil, bootstrap-time
  redis = createClient({
    socket: { host, port },
  });

  redis.on("error", (err) => {
    // Log kalsın; ama retry yok
    console.error("Redis error:", err?.message || err);
  });

  await redis.connect();
  console.log(`Redis connected: ${host}:${port}`);
}
