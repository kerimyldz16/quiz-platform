import { Server } from "socket.io";
import { authenticateSocket } from "./socketAuth.js";
import { getGameState } from "./gameLifecycle.js";
import { getRedis } from "./redis.js";
import { questions } from "./questions.js";

function publicQuestion(q) {
  return { id: q.id, text: q.text, options: q.options };
}

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", async (socket) => {
    try {
      const auth = await authenticateSocket(socket);
      socket.data = auth;
      socket.join("PLAYERS");

      const redis = getRedis();

      // anlık game state
      const gs = await getGameState();
      socket.emit("game:state", gs);

      const token = String(socket.data.sessionToken);
      const pkey = `player:${token}`;
      const player = await redis.hGetAll(pkey);

      // RUNNING ise oyuncuya kaldığı soruyu gönder (DONE değilse)
      if (gs.state === "RUNNING" && player.status !== "DONE") {
        await redis.hSet(pkey, { status: "IN_GAME" });

        const idx = Number(player.qIndex || 0);
        const q = questions[idx];
        if (q)
          socket.emit("question:current", {
            index: idx,
            question: publicQuestion(q),
          });
      }

      socket.on("answer", async ({ answer }) => {
        const gs2 = await getGameState();
        if (gs2.state !== "RUNNING") return;

        const token2 = String(socket.data.sessionToken);
        const pkey2 = `player:${token2}`;
        const p = await redis.hGetAll(pkey2);

        if (!p || !p.playerId) return;
        if (p.status === "DONE") return;

        const idx = Number(p.qIndex || 0);
        const q = questions[idx];
        if (!q) return;

        const isCorrect = String(answer) === String(q.correct);

        if (isCorrect) await redis.hIncrBy(pkey2, "correctCount", 1);
        else await redis.hIncrBy(pkey2, "wrongCount", 1);

        await redis.hIncrBy(pkey2, "qIndex", 1);

        const nextIndex = idx + 1;
        const total = Number(gs2.totalQuestions || questions.length);

        if (nextIndex < total) {
          socket.emit("question:current", {
            index: nextIndex,
            question: publicQuestion(questions[nextIndex]),
          });
        }

        const [correctCount, wrongCount] = await redis.hmGet(pkey2, [
          "correctCount",
          "wrongCount",
        ]);

        socket.emit("answer:ack", {
          correct: isCorrect,
          correctCount: Number(correctCount || 0),
          wrongCount: Number(wrongCount || 0),
          done: nextIndex >= total,
        });
      });

      socket.on("finish", async () => {
        const gs2 = await getGameState();
        if (gs2.state !== "RUNNING") return;

        const token2 = String(socket.data.sessionToken);
        const pkey2 = `player:${token2}`;
        const p = await redis.hGetAll(pkey2);

        if (!p || !p.playerId) return;
        if (p.status === "DONE") return;

        const total = Number(gs2.totalQuestions || questions.length);
        const qIndex = Number(p.qIndex || 0);

        if (qIndex < total) {
          socket.emit("finish:ack", {
            done: false,
            error: "Questions not completed",
          });
          return;
        }

        const now = Date.now();
        const startAt = Number(gs2.startAt || now);
        const durationMs = Math.max(0, now - startAt);

        await redis.hSet(pkey2, {
          status: "DONE",
          finishedAt: String(now),
          durationMs: String(durationMs),
        });

        socket.emit("finish:ack", { done: true, durationMs });
      });

      console.log(`Socket ${socket.id} connected`);
    } catch (err) {
      console.error("Socket auth failed:", err?.message || err);
      socket.disconnect(true);
    }
  });

  return io;
}
