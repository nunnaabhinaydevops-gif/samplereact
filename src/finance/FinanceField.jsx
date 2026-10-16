export default function FinanceField({ label, value }) {
  return (
    <div className="fin-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
