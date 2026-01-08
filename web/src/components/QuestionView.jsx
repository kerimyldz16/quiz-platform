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
    <div className="question-card-container">
      <div className="question-card">
        {/* Question Header */}
        <div className="question-header">
          <div className="question-number">
            <span className="badge">{payload.index + 1}</span>
          </div>
          <div className="question-progress">
            <span className="question-text">{q?.text}</span>
          </div>
        </div>

        {/* Options Grid */}
        <div className="options-grid">
          {(q?.options || []).map((opt, idx) => (
            <label key={opt} className="option-label">
              <input
                type="radio"
                name="question-option"
                checked={selected === opt}
                onChange={() => setSelected(opt)}
                className="option-input"
              />
              <div className="option-box">
                <div className="option-letter">
                  {String.fromCharCode(65 + idx)}
                </div>
                <div className="option-text">{opt}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Submit Button */}
        <button
          className="btn-primary btn-submit"
          onClick={submit}
          disabled={!selected}
        >
          <span>Cevapla</span>
          <span className="submit-icon">→</span>
        </button>
      </div>
    </div>
  );
}
