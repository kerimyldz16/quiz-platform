// app/src/socket.js
import { Server } from "socket.io";
import { authenticateSocket } from "./socketAuth.js";
import { getGameState } from "./gameLifecycle.js";
import { getRedis } from "./redis.js";
import { getQuestionsSnapshot } from "./questionStore.js";

function publicQuestion(q) {
  return { id: q.id, text: q.text, options: q.options };
}

async function getAnswerSummary(redis, pkey) {
  try {
    const raw = await redis.lRange(`${pkey}:answers`, 0, -1);
    return raw.map((x) => JSON.parse(x));
  } catch {
    return [];
  }
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

      // If player already DONE, tell client immediately (fix refresh -> pending)
      if (player?.status === "DONE") {
        const answers = await getAnswerSummary(redis, pkey);
        socket.emit("player:done", {
          correctCount: Number(player.correctCount || 0),
          wrongCount: Number(player.wrongCount || 0),
          durationMs: Number(player.durationMs || 0),
          answers,
        });
      } else {
        // If running and player not done -> send current question
        if (gs?.state === "RUNNING") {
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
      }

      socket.on("answer", async ({ answer }) => {
        const gs2 = await getGameState();
        if (gs2?.state !== "RUNNING") return;

        const token2 = String(socket.data.sessionToken);
        const pkey2 = `player:${token2}`;
        const p = await redis.hGetAll(pkey2);

        if (!p || !p.playerId || p.status === "DONE") return;

        const questions = await getQuestionsSnapshot();
        const total = Number(gs2.totalQuestions || questions.length);

        const idx = Number(p.qIndex || 0);
        const q = questions[idx];
        if (!q) return;

        const isCorrect = String(answer) === String(q.correct);

        // answer log
        await redis.rPush(
          `${pkey2}:answers`,
          JSON.stringify({
            index: idx,
            question: q.text,
            given: answer,
            correct: q.correct,
            isCorrect,
          })
        );

        if (isCorrect) await redis.hIncrBy(pkey2, "correctCount", 1);
        else await redis.hIncrBy(pkey2, "wrongCount", 1);

        await redis.hIncrBy(pkey2, "qIndex", 1);

        const nextIndex = idx + 1;

        // SON SORU İSE → OTOMATİK FINISH
        if (nextIndex >= total) {
          const now = Date.now();
          const joinedAt = Number(p.joinedAt || now);
          const durationMs = Math.max(1, now - joinedAt);

          await redis.hSet(pkey2, {
            status: "DONE",
            finishedAt: String(now),
            durationMs: String(durationMs),
          });

          const answers = await getAnswerSummary(redis, pkey2);

          // finish:ack (mevcut Home.jsx buna bakıyor)
          socket.emit("finish:ack", {
            done: true,
            durationMs,
            answers,
          });

          // ayrıca player:done da gönderelim (refresh sonrası aynı akış)
          socket.emit("player:done", {
            correctCount: Number(
              (await redis.hGet(pkey2, "correctCount")) || 0
            ),
            wrongCount: Number((await redis.hGet(pkey2, "wrongCount")) || 0),
            durationMs,
            answers,
          });

          return;
        }

        // normal akış
        const nextQ = questions[nextIndex];
        socket.emit("question:current", {
          index: nextIndex,
          question: publicQuestion(nextQ),
        });

        const [correctCount, wrongCount] = await redis.hmGet(pkey2, [
          "correctCount",
          "wrongCount",
        ]);

        socket.emit("answer:ack", {
          correct: isCorrect,
          correctCount: Number(correctCount || 0),
          wrongCount: Number(wrongCount || 0),
          done: false,
        });
      });

      // Artık gerek yok ama geriye uyumluluk için bırakıldı
      socket.on("finish", async () => {
        const gs2 = await getGameState();
        if (gs2?.state !== "RUNNING") return;

        const token2 = String(socket.data.sessionToken);
        const pkey2 = `player:${token2}`;
        const p = await redis.hGetAll(pkey2);

        if (!p || !p.playerId) return;

        if (p.status === "DONE") {
          const answers = await getAnswerSummary(redis, pkey2);
          socket.emit("player:done", {
            correctCount: Number(p.correctCount || 0),
            wrongCount: Number(p.wrongCount || 0),
            durationMs: Number(p.durationMs || 0),
            answers,
          });
          return;
        }

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

        const answers = await getAnswerSummary(redis, pkey2);

        socket.emit("finish:ack", { done: true, durationMs, answers });
        socket.emit("player:done", {
          correctCount: Number((await redis.hGet(pkey2, "correctCount")) || 0),
          wrongCount: Number((await redis.hGet(pkey2, "wrongCount")) || 0),
          durationMs,
          answers,
        });
      });

      socket.on("player:sync", async () => {
        const gs2 = await getGameState();
        socket.emit(
          "game:state",
          gs2 || { state: "IDLE", startAt: null, totalQuestions: null }
        );

        const token2 = String(socket.data.sessionToken);
        const pkey2 = `player:${token2}`;
        const p = await redis.hGetAll(pkey2);
        if (!p || !p.playerId) return;

        // ✅ DONE ise pending'e düşürme: DONE bilgisini geri gönder
        if (p.status === "DONE") {
          const answers = await getAnswerSummary(redis, pkey2);
          socket.emit("player:done", {
            correctCount: Number(p.correctCount || 0),
            wrongCount: Number(p.wrongCount || 0),
            durationMs: Number(p.durationMs || 0),
            answers,
          });
          return;
        }

        // RUNNING değilse soru gönderme
        if (gs2?.state !== "RUNNING") return;

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
