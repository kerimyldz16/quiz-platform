import express from "express";
import { startGame, endGame } from "./gameLifecycle.js";
import { getTop3AllCorrectFastest } from "./adminTop3.js";
import { persistAllPlayersToDb } from "./persistResults.js";
import { getPlayersByIds } from "./playerRepo.js";
import { loginAdmin, requireAdmin } from "./adminAuth.js";

export const adminRouter = express.Router();

function formatDuration(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes}.${String(seconds).padStart(2, "0")}.${String(
    centis
  ).padStart(2, "0")}dk`;
}

// PUBLIC
adminRouter.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const token = loginAdmin({ username, password });
  if (!token) return res.status(401).json({ error: "Invalid credentials" });

  res.json({ token });
});

// PROTECTED
adminRouter.post("/start", requireAdmin, async (req, res) => {
  try {
    const payload = await startGame("admin");
    res.json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post("/end", requireAdmin, async (req, res) => {
  try {
    const payload = await endGame("admin");

    await persistAllPlayersToDb();

    const top3Raw = await getTop3AllCorrectFastest();
    const ids = top3Raw.map((x) => x.playerId);
    const players = await getPlayersByIds(ids);
    const map = new Map(players.map((p) => [p.id, p]));

    const top3 = top3Raw.map((x, i) => {
      const p = map.get(x.playerId);
      return {
        rank: i + 1,
        firstName: p?.first_name || null,
        lastName: p?.last_name || null,
        phone: p?.phone || null,
        durationMs: x.durationMs,
        durationText: formatDuration(x.durationMs),
      };
    });

    res.json({ ...payload, top3 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get("/top3", requireAdmin, async (req, res) => {
  try {
    const top3Raw = await getTop3AllCorrectFastest();
    const ids = top3Raw.map((x) => x.playerId);
    const players = await getPlayersByIds(ids);
    const map = new Map(players.map((p) => [p.id, p]));

    const top3 = top3Raw.map((x, i) => {
      const p = map.get(x.playerId);
      return {
        rank: i + 1,
        firstName: p?.first_name || null,
        lastName: p?.last_name || null,
        phone: p?.phone || null,
        durationMs: x.durationMs,
        durationText: formatDuration(x.durationMs),
      };
    });

    res.json({ top3 });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute top3" });
  }
});
