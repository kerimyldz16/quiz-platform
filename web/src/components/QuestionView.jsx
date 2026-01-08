import { useState } from "react";

export default function QuestionView({ payload, onAnswer }) {
  const [selected, setSelected] = useState("");
  const q = payload?.question;

  async function submit() {
    if (!selected) return;
    await onAnswer(selected);
    setSelected("");
  }

  return (
    <div className="card question-card">
      <b>Soru {payload.index + 1}</b>

      <div style={{ marginBottom: 12 }}>{q?.text}</div>

      {(q?.options || []).map((opt) => (
        <label key={opt}>
          <input
            type="radio"
            checked={selected === opt}
            onChange={() => setSelected(opt)}
          />
          {opt}
        </label>
      ))}

      <button className="btn-primary" onClick={submit} disabled={!selected}>
        Cevapla
      </button>
    </div>
  );
}
