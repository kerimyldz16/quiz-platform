import { Server } from "socket.io";

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // şimdilik
    },
  });

  io.on("connection", (socket) => {
    // Bu aşamada BURASI boş kalacak
    console.log("Socket connected:", socket.id);
  });

  return io;
}
