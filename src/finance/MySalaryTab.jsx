import { useState } from 'react'
import { Chip } from '../hrms/ui'
import { formatDateKey } from '../me/time'
import SalaryBreakdown from './SalaryBreakdown'
import { formatAmount, formatText, summarizePayroll } from './payroll'

function periodLabel(record) {
  return record.periodStart && record.periodEnd
    ? `${formatDateKey(record.periodStart)} – ${formatDateKey(record.periodEnd)}`
    : 'Not Available'
}

function Figure({ label, value }) {
  return (
    <div className="fin-figure">
      <span className="fin-subhead">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function TimelineItem({ record, current }) {
  const [open, setOpen] = useState(false)
  const totals = summarizePayroll(record)

  return (
    <li className="fin-timeline-item">
      <span className="fin-timeline-dot" aria-hidden="true" />
      <div className="fin-timeline-body">
        <div className="fin-timeline-head">
          <strong>Payroll · {formatText(record.cycleLabel)}</strong>
          <span className="fin-muted">Period {periodLabel(record)}</span>
          {current && <Chip tone="blue">Current</Chip>}
        </div>
        <div className="fin-timeline-figures">
          <Figure label="Gross earnings" value={formatAmount(totals.gross)} />
          <span className="fin-op">−</span>
          <Figure label="Deductions" value={formatAmount(totals.totalDeductions)} />
          <span className="fin-op">=</span>
          <Figure label="Net salary" value={formatAmount(totals.net)} />
          <button type="button" className="fin-link" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'Hide salary breakdown' : 'View salary breakdown'}
          </button>
        </div>
        {open && <SalaryBreakdown record={record} />}
      </div>
    </li>
  )
}

export default function MySalaryTab({ records }) {
  const latest = records[0] ?? null
  const latestTotals = latest ? summarizePayroll(latest) : null

  return (
    <div className="fin-stack">
      <div className="fin-stat-row">
        <section className="dash-card fin-card fin-stat-card">
          <span className="fin-subhead">Current compensation</span>
          <strong>{latestTotals?.gross != null ? `${formatAmount(latestTotals.gross)} / Month` : 'Not Available'}</strong>
        </section>
        <section className="dash-card fin-card fin-stat-card">
          <span className="fin-subhead">Latest processed cycle</span>
          <strong>{formatText(latest?.cycleLabel)}</strong>
        </section>
      </div>

      <section className="dash-card fin-card">
        <h3 className="fin-card-title">Salary timeline</h3>
        {records.length === 0 ? (
          <p className="me-state">No processed payroll cycles yet. Your salary history will appear here.</p>
        ) : (
          <ol className="fin-timeline">
            {records.map((record, index) => (
              <TimelineItem key={record.id} record={record} current={index === 0} />
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
