import express from "express";
import { startGame, endGame, resetGame } from "./gameLifecycle.js";
import { getTop3AllCorrectFastest } from "./adminTop3.js";
import { persistAllPlayersToDb } from "./persistResults.js";
import { getPlayersByIds } from "./playerRepo.js";
import { loginAdmin, requireAdmin } from "./adminAuth.js";
import { getIo } from "./socketInstance.js";
import { getRedis } from "./redis.js";
import { db } from "./db.js";

export const adminRouter = express.Router();

function formatDuration(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes}.${String(seconds).padStart(2, "0")}.${String(
    centis
  ).padStart(2, "0")}sn`;
}

// PUBLIC
adminRouter.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Eksik Kimlik Bilgileri" });
  }

  const token = loginAdmin({ username, password });
  if (!token)
    return res.status(401).json({ error: "Geçersiz Kimlik Bilgileri" });

  res.json({ token });
});

// PROTECTED
adminRouter.post("/start", requireAdmin, async (req, res) => {
  try {
    const payload = await startGame("admin");
    res.json(payload);
    const io = getIo();
    io.to("PLAYERS").emit("game:state", payload);
    io.to("PLAYERS").emit("game:started", { startAt: payload.startAt });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post("/end", requireAdmin, async (req, res) => {
  try {
    await endGame("admin");

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
        nickName: p?.nick_name || null,
        phone: p?.phone || null,
        durationMs: x.durationMs,
        durationText: formatDuration(x.durationMs),
      };
    });

    const payload = { state: "FINISHED", top3 };

    res.json(payload);

    const io = getIo();
    io.to("PLAYERS").emit("game:state", payload);
    io.to("PLAYERS").emit("game:finished", payload);
  } catch (err) {
    console.error("END_GAME_ERROR:", err);
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get("/top3", requireAdmin, async (req, res) => {
  try {
    // 304/etag/caching problemlerini de tamamen kes
    res.setHeader("Cache-Control", "no-store");

    // totalQuestions: DB'den
    const totalQRes = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM questions`
    );
    const totalQuestions = totalQRes.rows?.[0]?.cnt ?? 0;

    if (totalQuestions < 1) {
      return res.status(200).json({ totalQuestions: 0, top3: [] });
    }

    // Top3: tüm soruları doğru + en hızlı 3
    const r = await db.query(
      `
      SELECT first_name, last_name, nick_name, phone, duration_ms
      FROM players
      WHERE wrong_count = 0
        AND correct_count = $1
        AND duration_ms IS NOT NULL
        AND duration_ms > 0
      ORDER BY duration_ms ASC
      LIMIT 3
      `,
      [totalQuestions]
    );

    const top3 = (r.rows || []).map((p, i) => ({
      rank: i + 1,
      firstName: p.first_name,
      lastName: p.last_name,
      nickName: p.nick_name,
      phone: p.phone,
      durationMs: p.duration_ms,
    }));

    return res.status(200).json({ totalQuestions, top3 });
  } catch (e) {
    console.error("TOP3_ERROR:", e);
    return res.status(500).json({ error: "Top3 failed" });
  }
});
adminRouter.get("/users.csv", requireAdmin, async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="users.csv"`);
    res.setHeader("Cache-Control", "no-store");

    const r = await db.query(`
      SELECT first_name, last_name, nick_name, phone,
             correct_count, wrong_count, duration_ms,
             created_at, finished_at
      FROM players
      ORDER BY created_at DESC
    `);

    // CSV escape
    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = [
      "first_name",
      "last_name",
      "nick_name",
      "phone",
      "correct_count",
      "wrong_count",
      "duration_ms",
      "created_at",
      "finished_at",
    ].join(",");

    const lines = r.rows.map((row) =>
      [
        esc(row.first_name),
        esc(row.last_name),
        esc(row.nick_name),
        esc(row.phone),
        esc(row.correct_count),
        esc(row.wrong_count),
        esc(row.duration_ms),
        esc(row.created_at),
        esc(row.finished_at),
      ].join(",")
    );

    const csv = [header, ...lines].join("\n");
    return res.status(200).send(csv);
  } catch (e) {
    console.error("CSV_EXPORT_ERROR:", e);
    return res.status(500).json({ error: "CSV export failed" });
  }
});
