import express from "express";
import { requireAdmin } from "./adminAuth.js";
import { listUsers, deleteAllUsers } from "./adminUserRepo.js";
import { getGameState } from "./gameLifecycle.js";
import { getRedis } from "./redis.js";

export const adminUsersRouter = express.Router();

adminUsersRouter.get("/users", requireAdmin, async (req, res) => {
  const users = await listUsers();
  res.json({ users });
});

adminUsersRouter.delete("/users", requireAdmin, async (req, res) => {
  const gs = await getGameState();
  if (gs.state === "RUNNING") {
    return res.status(400).json({ error: "Cannot delete users while RUNNING" });
  }

  await deleteAllUsers();

  // Redis tarafını da temizle (dev için)
  const redis = getRedis();
  await redis.multi().del("players:active").exec();

  res.json({ ok: true });
});
