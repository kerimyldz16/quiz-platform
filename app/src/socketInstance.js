let ioRef = null;

export function setIo(io) {
  ioRef = io;
}

export function getIo() {
  if (!ioRef) throw new Error("Socket.IO instance not set");
  return ioRef;
}
