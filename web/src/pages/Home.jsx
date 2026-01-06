import { useEffect, useMemo, useRef, useState } from "react";
import { storage } from "../lib/storage.jsx";
import { connectPlayerSocket } from "../lib/socket.jsx";
import RegisterForm from "../components/RegisterForm.jsx";
import Pending from "../components/Pending.jsx";
import QuestionView from "../components/QuestionView.jsx";
import DonePending from "../components/DonePending.jsx";

export default function Home() {
  const [sessionToken, setSessionToken] = useState(storage.getSessionToken());
  const [gameState, setGameState] = useState({
    state: "IDLE",
    startAt: null,
    totalQuestions: null,
  });
  const [question, setQuestion] = useState(null); // {index, question:{id,text,options}}
  const [progress, setProgress] = useState({
    correctCount: 0,
    wrongCount: 0,
    done: false,
  });
  const socketRef = useRef(null);

  const hasToken = useMemo(() => !!sessionToken, [sessionToken]);

  useEffect(() => {
    if (!hasToken) return;

    const socket = connectPlayerSocket(sessionToken);
    socketRef.current = socket;

    socket.on("connect", () => {});
    socket.on("disconnect", () => {});

    socket.on("game:state", (gs) => {
      setGameState(gs || { state: "IDLE" });
    });

    socket.on("question:current", (payload) => {
      setQuestion(payload);
      setProgress((p) => ({ ...p, done: false }));
    });

    socket.on("answer:ack", (ack) => {
      setProgress({
        correctCount: Number(ack.correctCount || 0),
        wrongCount: Number(ack.wrongCount || 0),
        done: !!ack.done,
      });
    });

    socket.on("finish:ack", (ack) => {
      if (ack?.done) {
        setProgress((p) => ({ ...p, done: true }));
      }
    });

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [hasToken, sessionToken]);

  function onRegistered(token) {
    storage.setSessionToken(token);
    setSessionToken(token);
  }

  function logout() {
    storage.clearSessionToken();
    setSessionToken("");
    setQuestion(null);
    setProgress({ correctCount: 0, wrongCount: 0, done: false });
    setGameState({ state: "IDLE", startAt: null, totalQuestions: null });
  }

  async function submitAnswer(answer) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("answer", { answer });
  }

  async function finish() {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("finish");
  }

  // UI karar ağacı
  if (!hasToken) {
    return <RegisterForm onRegistered={onRegistered} />;
  }

  if (gameState?.state === "PENDING" || gameState?.state === "IDLE") {
    return (
      <div>
        <div style={{ marginBottom: 12 }}>
          <button onClick={logout}>Çıkış (token sil)</button>
        </div>
        <Pending title="Diğer katılımcılar bekleniyor" />
      </div>
    );
  }

  if (gameState?.state === "RUNNING") {
    return (
      <div>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <button onClick={logout}>Çıkış (token sil)</button>
          <div>
            Doğru: <b>{progress.correctCount}</b> | Yanlış:{" "}
            <b>{progress.wrongCount}</b>
          </div>
        </div>

        {question ? (
          <QuestionView
            payload={question}
            done={progress.done}
            onAnswer={submitAnswer}
            onFinish={finish}
          />
        ) : (
          <DonePending title="Soru bekleniyor (oyun başladıysa biraz sonra gelir)" />
        )}
      </div>
    );
  }

  if (gameState?.state === "FINISHED") {
    return (
      <div>
        <div style={{ marginBottom: 12 }}>
          <button onClick={logout}>Çıkış (token sil)</button>
        </div>
        <div>Yarışma bitti. Sonuçlar admin panelde değerlendirilecek.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={logout}>Çıkış (token sil)</button>
      </div>
      <div>Durum: {String(gameState?.state || "UNKNOWN")}</div>
    </div>
  );
}
