import express from "express";
import { requireAdmin } from "./adminAuth.js";
import { listUsersCount, deleteAllUsers } from "./adminUserRepo.js";
import { getGameState, resetGame } from "./gameLifecycle.js";
import { getRedis } from "./redis.js";
import { getIo } from "./socketInstance.js";

export const adminUsersRouter = express.Router();

/* Kullanıcı sayısı */
adminUsersRouter.get("/users", requireAdmin, async (req, res) => {
  const count = await listUsersCount();
  res.json({ count });
});

adminUsersRouter.delete("/users", requireAdmin, async (req, res) => {
  const gs = await getGameState();
  if (gs.state === "RUNNING") {
    return res.status(400).json({ error: "Cannot delete users while RUNNING" });
  }

  /* 1️⃣ DB */
  await deleteAllUsers();

  /* 2️⃣ REDIS: her şeyi sıfırla */
  await resetGame(); // 🔑 KRİTİK SATIR

  /* 3️⃣ Client’ları düşür */
  const io = getIo();
  io.to("PLAYERS").emit("session:invalidated");

  res.json({ ok: true });
});
