export default function Pending({ title }) {
  return (
    <div className="card pending-wrap">
      <h3 className="muted">{title}</h3>
      <div className="pending-dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="muted">Bekleniyor...</div>
    </div>
  );
}
