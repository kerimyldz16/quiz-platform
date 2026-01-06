import { getRedis } from "./redis.js";

export async function authenticateSocket(socket) {
  const { sessionToken } = socket.handshake.query;

  if (!sessionToken) {
    throw new Error("sessionToken required");
  }

  const redis = getRedis();
  const player = await redis.hGetAll(`player:${sessionToken}`);

  if (!player || !player.playerId) {
    throw new Error("Invalid session");
  }

  return {
    sessionToken: String(sessionToken),
    playerId: Number(player.playerId),
  };
}
