import express from "express";
import { generateSessionToken } from "./session.js";
import { createPlayer } from "./playerRepo.js";
import { registerPlayer } from "./playerRegistry.js";
import { setPendingIfIdle, getGameState } from "./gameLifecycle.js";

export const playerRouter = express.Router();

playerRouter.post("/kayit", async (req, res) => {
  const { firstName, lastName, phone } = req.body;

  if (!firstName || !lastName || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const gs = await getGameState();
    if (gs.state === "FINISHED") {
      return res.status(400).json({ error: "Registration is closed" });
    }

    const playerId = await createPlayer({ firstName, lastName, phone });

    const sessionToken = generateSessionToken();
    await registerPlayer(sessionToken, playerId);

    await setPendingIfIdle();

    res.json({ sessionToken });
  } catch (err) {
    // Postgres unique violation (phone)
    if (err?.code === "23505") {
      return res.status(400).json({ error: "Phone already registered" });
    }

    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});
