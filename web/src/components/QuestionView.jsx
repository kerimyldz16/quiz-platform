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
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 8 }}>
        <b>Soru {payload.index + 1}</b>
      </div>

      <div style={{ marginBottom: 12 }}>{q?.text}</div>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        {(q?.options || []).map((opt) => (
          <label
            key={opt}
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
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
        <button onClick={submit} disabled={!selected}>
          Cevapla
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div>Tüm sorular cevaplandı.</div>
          <button onClick={onFinish}>Bitir</button>
        </div>
      )}
    </div>
  );
}
