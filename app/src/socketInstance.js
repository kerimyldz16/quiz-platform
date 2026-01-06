let io = null;

export function setIo(serverIo) {
  io = serverIo;
}

export function getIo() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
