import { useState } from 'react'
import { useAttendanceRange, useNow } from './hooks'
import { formatMinutes, mondayOfDateKey, shiftDateKey, toIstDateKey } from './time'

const RANGES = [
  { value: 'this', label: 'This week' },
  { value: 'last', label: 'Last week' },
]

export default function AttendanceStats({ uid }) {
  const now = useNow()
  const todayKey = toIstDateKey(now)
  const [range, setRange] = useState('this')
  const thisWeekStart = mondayOfDateKey(todayKey)
  const isThisWeek = range === 'this'
  const fromKey = isThisWeek ? thisWeekStart : shiftDateKey(thisWeekStart, -7)
  const toKey = isThisWeek ? todayKey : shiftDateKey(thisWeekStart, -1)
  const attendance = useAttendanceRange(uid, fromKey, toKey)

  const completed = attendance.records.filter((record) => record.workedMinutes != null)
  const totalMinutes = completed.reduce((sum, record) => sum + record.workedMinutes, 0)
  const averageMinutes = completed.length ? Math.round(totalMinutes / completed.length) : null

  const arrivals = attendance.records.filter((record) => record.punchIn)
  const onTimeCount = arrivals.filter((record) => !record.isLate).length
  const onTimePercent = arrivals.length ? Math.round((onTimeCount / arrivals.length) * 100) : null

  return (
    <section className="dash-card me-card">
      <div className="me-section-head">
        <h3>Attendance stats</h3>
        <select
          className="me-select"
          aria-label="Stats period"
          value={range}
          onChange={(event) => setRange(event.target.value)}
        >
          {RANGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {attendance.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load stats: {attendance.error}
        </p>
      )}

      <div className="me-stat-row">
        <div className="me-stat-person">
          <span className="me-stat-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </span>
          <span>Me</span>
        </div>
        <div className="me-stat">
          <span className="me-stat-label">Avg hrs / day</span>
          <strong className="me-stat-value">{averageMinutes === null ? '—' : formatMinutes(averageMinutes)}</strong>
        </div>
        <div className="me-stat">
          <span className="me-stat-label">On time arrival</span>
          <strong className="me-stat-value">{onTimePercent === null ? '—' : `${onTimePercent}%`}</strong>
        </div>
      </div>

      <p className="hrms-muted">Averages cover days with a completed punch in the selected period.</p>
    </section>
  )
}
