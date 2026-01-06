import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export function connectPlayerSocket(sessionToken) {
  if (!sessionToken) return null;

  const socket = io(SOCKET_URL, {
    transports: ["websocket"],
    query: { sessionToken },
  });

  return socket;
}
