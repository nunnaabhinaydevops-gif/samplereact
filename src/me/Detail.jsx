export default function Detail({ label, value }) {
  return (
    <div className="me-detail">
      <dt>{label}</dt>
      <dd>{value || 'Not set'}</dd>
    </div>
  )
}
