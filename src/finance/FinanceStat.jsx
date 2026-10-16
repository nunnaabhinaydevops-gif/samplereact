export default function FinanceStat({ label, value, hint }) {
  return (
    <div className="fin-stat">
      <span className="fin-subhead">{label}</span>
      <strong>{value}</strong>
      {hint && <span className="fin-muted">{hint}</span>}
    </div>
  )
}
