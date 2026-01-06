import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";

import { adminRouter } from "./adminRoutes.js";
import { playerRouter } from "./playerRoutes.js";
import { connectRedis } from "./redis.js";
import { testDb } from "./db.js";
import { initGameState } from "./gameState.js";
import { createSocketServer } from "./socket.js";
import { setIo } from "./socketInstance.js";

dotenv.config();

const app = express();

const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.use(playerRouter); // /kayit
app.use("/admin", adminRouter);

const server = http.createServer(app);

async function bootstrap() {
  await connectRedis();
  await testDb();
  await initGameState();

  const io = createSocketServer(server);
  setIo(io);

  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`HTTP + Socket server listening on ${PORT}`);
  });
}

bootstrap();
