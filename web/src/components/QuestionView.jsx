import { useState } from "react";

export default function QuestionView({ payload, done, onAnswer, onFinish }) {
  const [selected, setSelected] = useState("");

  const q = payload?.question;

  async function submit() {
    if (!selected) return;
    await onAnswer(selected);
    setSelected("");
  }

  return (
    <div className="card question-card">
      <div className="status-bar">
        <b>Soru {payload.index + 1}</b>
      </div>

      <div style={{ marginBottom: 12 }}>{q?.text}</div>

      <div className="options" style={{ marginBottom: 12 }}>
        {(q?.options || []).map((opt) => (
          <label key={opt} className="option">
            <input
              type="radio"
              name="opt"
              value={opt}
              checked={selected === opt}
              onChange={() => setSelected(opt)}
              disabled={done}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>

      {!done ? (
        <button className="btn-primary" onClick={submit} disabled={!selected}>
          Cevapla
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div>Tüm sorular cevaplandı.</div>
          <button className="btn-primary" onClick={onFinish}>
            Bitir
          </button>
        </div>
      )}
    </div>
  );
}
