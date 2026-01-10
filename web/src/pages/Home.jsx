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

  const [question, setQuestion] = useState(null);
  const [waitingAfterFinish, setWaitingAfterFinish] = useState(false);
  const [answersSummary, setAnswersSummary] = useState([]);

  const [progress, setProgress] = useState({
    correctCount: 0,
    wrongCount: 0,
    done: false,
  });

  const socketRef = useRef(null);
  const hasToken = useMemo(() => !!sessionToken, [sessionToken]);

  /* SOCKET BOOTSTRAP */
  useEffect(() => {
    if (!hasToken) return;

    const socket = connectPlayerSocket(sessionToken);
    socketRef.current = socket;

    socket.on("game:state", (gs) => {
      setGameState(gs || { state: "IDLE" });
    });

    socket.on("question:current", (payload) => {
      setQuestion(payload);
      setWaitingAfterFinish(false);
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
      if (!ack?.done) return;

      setWaitingAfterFinish(true);
      setQuestion(null);
      setProgress((p) => ({ ...p, done: true }));
      setAnswersSummary(ack.answers || []);
    });

    socket.on("player:done", (payload) => {
      setWaitingAfterFinish(true);
      setQuestion(null);
      setProgress({
        correctCount: payload.correctCount,
        wrongCount: payload.wrongCount,
        done: true,
      });
      setAnswersSummary(payload.answers || []);
    });

    socket.on("session:invalidated", () => {
      storage.clearSessionToken();
      setSessionToken("");
      setQuestion(null);
      setWaitingAfterFinish(false);
      setAnswersSummary([]);
      setProgress({ correctCount: 0, wrongCount: 0, done: false });
      setGameState({ state: "IDLE" });
      socket.disconnect();
    });

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [hasToken, sessionToken]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("player:sync");
  }, [gameState.state]);

  function onRegistered(token) {
    storage.setSessionToken(token);
    setSessionToken(token);
  }

  async function submitAnswer(answer) {
    socketRef.current?.emit("answer", { answer });
  }

  /* UI */

  if (!hasToken) {
    return <RegisterForm onRegistered={onRegistered} />;
  }

  if (gameState.state === "IDLE" || gameState.state === "PENDING") {
    return <Pending title="Diğer katılımcılar bekleniyor..." />;
  }

  if (gameState.state === "RUNNING") {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {waitingAfterFinish ? (
          <>
            <DonePending title="Tebrikler! Bitirdiniz." />
            <AnswerSummary answers={answersSummary} />
          </>
        ) : question ? (
          <QuestionView
            payload={question}
            done={progress.done}
            onAnswer={submitAnswer}
          />
        ) : (
          <Pending title="Soru yükleniyor..." />
        )}
      </div>
    );
  }

  if (gameState.state === "FINISHED") {
    return <DonePending title="Yarışma sona erdi." />;
  }

  return null;
}

function AnswerSummary({ answers }) {
  if (!answers?.length) return null;

  return (
    <div className="answer-summary-container">
      <div className="answer-summary-card">
        <div className="summary-header">
          <h4 className="summary-title">Cevap Özeti</h4>
          <span className="summary-badge">{answers.length} Soru</span>
        </div>

        <div className="summary-items">
          {answers.map((a, i) => (
            <div
              key={i}
              className={`summary-item ${
                a.isCorrect ? "correct" : "incorrect"
              }`}
            >
              <div className="item-number">{i + 1}</div>
              <div className="item-content">
                <div className="item-question">{a.question}</div>
                <div className="item-details">
                  <span className="label-given">Cevabın:</span>
                  <span className="value-given">{a.given}</span>
                  {!a.isCorrect && (
                    <>
                      <span className="label-correct">Doğrusu:</span>
                      <span className="value-correct">{a.correct}</span>
                    </>
                  )}
                </div>
              </div>
              <div
                className={`item-icon ${
                  a.isCorrect ? "correct-icon" : "incorrect-icon"
                }`}
              >
                {a.isCorrect ? "✓" : "✕"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
