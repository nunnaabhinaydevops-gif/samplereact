import { LEAVE_TYPES, MONTH_NAMES } from './constants'

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dayCount(value) {
  return `${value} ${value === 1 ? 'day' : 'days'}`
}

function BarChart({ label, labels, values }) {
  const max = Math.max(...values, 1)
  return (
    <div className="me-bars" role="img" aria-label={label}>
      {values.map((value, index) => (
        <div key={labels[index]} className="me-bar-col" title={`${labels[index]}: ${dayCount(value)}`}>
          <div className="me-bar-track">
            <span className="me-bar" style={{ height: `${(value / max) * 100}%` }} />
          </div>
          <span className="me-bar-label">{labels[index]}</span>
        </div>
      ))}
    </div>
  )
}

function Donut({ segments, total }) {
  let cursor = 0
  const stops = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const start = cursor
      cursor += (segment.value / total) * 100
      return `${segment.color} ${start}% ${cursor}%`
    })
  const background = total ? `conic-gradient(${stops.join(', ')})` : 'var(--dash-line)'

  return (
    <div className="me-donut" style={{ background }}>
      <div className="me-donut-hole">
        <strong>{total}</strong>
        <span>{total === 1 ? 'day used' : 'days used'}</span>
      </div>
    </div>
  )
}

export default function LeaveStats({ summary }) {
  const consumedTotal = LEAVE_TYPES.reduce((sum, type) => sum + summary.used[type.value], 0)

  return (
    <div className="me-leave-stats">
      <section className="dash-card me-card">
        <div className="me-section-head">
          <h3>Weekly pattern</h3>
        </div>
        <BarChart label="Approved leave days by weekday" labels={WEEK_LABELS} values={summary.weekly} />
      </section>

      <section className="dash-card me-card">
        <div className="me-section-head">
          <h3>Consumed leave types</h3>
        </div>
        <div className="me-donut-row">
          <Donut
            total={consumedTotal}
            segments={LEAVE_TYPES.map((type) => ({ value: summary.used[type.value], color: type.color }))}
          />
          <ul className="me-legend">
            {LEAVE_TYPES.map((type) => (
              <li key={type.value}>
                <span className="me-legend-dot" style={{ background: type.color }} aria-hidden="true" />
                <span>{type.label}</span>
                <strong>{summary.used[type.value]}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dash-card me-card">
        <div className="me-section-head">
          <h3>Monthly stats</h3>
        </div>
        <BarChart label="Approved leave days by month" labels={MONTH_NAMES} values={summary.monthly} />
      </section>
    </div>
  )
}
