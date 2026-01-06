import express from "express";
import http from "http";
import dotenv from "dotenv";
import { connectRedis } from "./redis.js";
import { testDb } from "./db.js";
import { initGameState } from "./gameState.js";
import { generateSessionToken } from "./session.js";
import { createPlayer } from "./playerRepo.js";
import { registerPlayer } from "./playerRegistry.js";
import { createSocketServer } from "./socket.js";

dotenv.config();

const app = express();

app.get("/", (req, res) => {
  res.send("Backend running");
});

const PORT = 3000;

async function bootstrap() {
  await connectRedis();
  await testDb();
  await initGameState();

  const io = createSocketServer(server);

  app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
  });
}

app.use(express.json());

app.post("/kayit", async (req, res) => {
  const { firstName, lastName, phone, nickname } = req.body;

  if (!firstName || !lastName || !phone || !nickname) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const playerId = await createPlayer({
      firstName,
      lastName,
      phone,
      nickname,
    });

    const sessionToken = generateSessionToken();

    await registerPlayer(sessionToken, playerId);

    res.json({
      sessionToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

bootstrap();
