export default function DonePending({ title }) {
  return (
    <div className="card result-done">
      <div className="checkmark">✓</div>
      <div>
        <h3>{title}</h3>
        <div className="muted">Bitirdiniz.</div>
      </div>
    </div>
  );
}
