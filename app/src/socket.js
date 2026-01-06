// app/src/socket.js
import { Server } from "socket.io";
import { authenticateSocket } from "./socketAuth.js";
import { getGameState } from "./gameLifecycle.js";
import { getRedis } from "./redis.js";
import { getQuestionsSnapshot } from "./questionStore.js";

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

      // Send current game state immediately
      const gs = await getGameState();
      socket.emit(
        "game:state",
        gs || { state: "IDLE", startAt: null, totalQuestions: null }
      );

      const token = String(socket.data.sessionToken);
      const pkey = `player:${token}`;
      const player = await redis.hGetAll(pkey);

      // If running and player not done -> send current question
      if (gs?.state === "RUNNING" && player?.status !== "DONE") {
        await redis.hSet(pkey, { status: "IN_GAME" });

        const questions = await getQuestionsSnapshot();
        const idx = Number(player.qIndex || 0);
        const q = questions[idx];

        if (q) {
          socket.emit("question:current", {
            index: idx,
            question: publicQuestion(q),
          });
        }
      }

      socket.on("answer", async ({ answer }) => {
        const gs2 = await getGameState();
        if (gs2?.state !== "RUNNING") return;

        const token2 = String(socket.data.sessionToken);
        const pkey2 = `player:${token2}`;
        const p = await redis.hGetAll(pkey2);

        if (!p || !p.playerId) return;
        if (p.status === "DONE") return;

        const questions = await getQuestionsSnapshot();
        const total = Number(gs2.totalQuestions || questions.length);

        const idx = Number(p.qIndex || 0);
        const q = questions[idx];
        if (!q) return;

        const isCorrect = String(answer) === String(q.correct);

        if (isCorrect) await redis.hIncrBy(pkey2, "correctCount", 1);
        else await redis.hIncrBy(pkey2, "wrongCount", 1);

        await redis.hIncrBy(pkey2, "qIndex", 1);

        const nextIndex = idx + 1;

        if (nextIndex < total) {
          const nextQ = questions[nextIndex];
          if (nextQ) {
            socket.emit("question:current", {
              index: nextIndex,
              question: publicQuestion(nextQ),
            });
          }
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
        if (gs2?.state !== "RUNNING") return;

        const token2 = String(socket.data.sessionToken);
        const pkey2 = `player:${token2}`;
        const p = await redis.hGetAll(pkey2);

        if (!p || !p.playerId) return;
        if (p.status === "DONE") return;

        const questions = await getQuestionsSnapshot();
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
        const joinedAt = Number(p.joinedAt || now);
        const durationMs = Math.max(1, now - joinedAt);

        await redis.hSet(pkey2, {
          status: "DONE",
          finishedAt: String(now),
          durationMs: String(durationMs),
        });

        socket.emit("finish:ack", { done: true, durationMs });
      });
      socket.on("player:sync", async () => {
        const gs2 = await getGameState();
        socket.emit(
          "game:state",
          gs2 || { state: "IDLE", startAt: null, totalQuestions: null }
        );

        if (gs2?.state !== "RUNNING") return;

        const redis = getRedis();
        const token2 = String(socket.data.sessionToken);
        const pkey2 = `player:${token2}`;
        const p = await redis.hGetAll(pkey2);
        if (!p || !p.playerId) return;
        if (p.status === "DONE") return;

        const alreadyJoined = await redis.hGet(pkey2, "joinedAt");

        if (!alreadyJoined) {
          await redis.hSet(pkey2, {
            status: "IN_GAME",
            joinedAt: String(Date.now()),
          });
        } else {
          await redis.hSet(pkey2, { status: "IN_GAME" });
        }

        const questions = await getQuestionsSnapshot();
        const idx = Number(p.qIndex || 0);
        const q = questions[idx];
        if (!q) return;

        socket.emit("question:current", {
          index: idx,
          question: publicQuestion(q),
        });
      });

      console.log(`Socket ${socket.id} connected`);
    } catch (err) {
      console.error("Socket auth failed:", err?.message || err);
      socket.disconnect(true);
    }
  });

  return io;
}
