import { useState } from 'react'
import { Chip, Kpi } from '../hrms/ui'
import { DAY_STATUS, deriveDayStatus } from './attendanceStatus'
import { useAttendanceRange, useNow } from './hooks'
import {
  daysInMonthKey,
  formatDateKey,
  formatMinutes,
  formatIstTime,
  monthKeyOf,
  shiftMonthKey,
  toIstDateKey,
  weekdayOfDateKey,
} from './time'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LEGEND = ['present', 'late', 'incomplete', 'absent', 'leave', 'holiday', 'weekly_off', 'working']

export default function AttendanceCalendar({ uid, policy }) {
  const now = useNow()
  const todayKey = toIstDateKey(now)
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(todayKey))
  const firstKey = `${monthKey}-01`
  const lastKey = `${monthKey}-${String(daysInMonthKey(monthKey)).padStart(2, '0')}`
  const attendance = useAttendanceRange(uid, firstKey, lastKey)

  const recordsByDate = new Map(attendance.records.map((record) => [record.date, record]))
  const holidays = new Map((policy.data?.holidays ?? []).map((holiday) => [holiday.date, holiday.name]))
  const weeklyOffs = policy.data?.weeklyOffs ?? []

  function statusFor(dateKey) {
    return deriveDayStatus({
      dateKey,
      todayKey,
      record: recordsByDate.get(dateKey),
      holidayName: holidays.get(dateKey),
      isWeeklyOff: weeklyOffs.includes(weekdayOfDateKey(dateKey)),
    })
  }

  const days = Array.from({ length: daysInMonthKey(monthKey) }, (_, index) => {
    const dateKey = `${monthKey}-${String(index + 1).padStart(2, '0')}`
    return { day: index + 1, dateKey, status: statusFor(dateKey) }
  })
  const counts = days.reduce((acc, day) => ({ ...acc, [day.status]: (acc[day.status] ?? 0) + 1 }), {})
  const workedMinutes = attendance.records.reduce((sum, record) => sum + (record.workedMinutes ?? 0), 0)
  const history = [...attendance.records].sort((a, b) => b.date.localeCompare(a.date))
  const leadingBlanks = weekdayOfDateKey(firstKey)
  const isCurrentMonth = monthKey === monthKeyOf(todayKey)

  return (
    <section className="dash-card me-card">
      <div className="me-section-head">
        <h3>Monthly attendance</h3>
        <div className="me-month-nav">
          <button
            type="button"
            className="hrms-btn-ghost"
            aria-label="Previous month"
            onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}
          >
            ‹ Prev
          </button>
          <strong>{formatDateKey(firstKey, { day: undefined, month: 'long', year: 'numeric' })}</strong>
          <button
            type="button"
            className="hrms-btn-ghost"
            aria-label="Next month"
            disabled={isCurrentMonth}
            onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}
          >
            Next ›
          </button>
          {!isCurrentMonth && (
            <button type="button" className="hrms-btn-ghost" onClick={() => setMonthKey(monthKeyOf(todayKey))}>
              This month
            </button>
          )}
        </div>
      </div>

      {attendance.status === 'loading' && <p className="me-state">Loading attendance…</p>}
      {attendance.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load attendance: {attendance.error}
        </p>
      )}
      {policy.status !== 'ready' && (
        <p className="hrms-muted">Weekly offs and holidays appear once HR configures the attendance policy.</p>
      )}

      <div className="hrms-kpis">
        <Kpi label="Present or late" value={(counts.present ?? 0) + (counts.late ?? 0)} tone="green" />
        <Kpi label="Absent" value={counts.absent ?? 0} tone="red" />
        <Kpi label="Leave" value={counts.leave ?? 0} tone="blue" />
        <Kpi label="Hours this month" value={formatMinutes(workedMinutes)} tone="amber" />
      </div>

      <div className="me-calendar">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="me-cal-head">
            {weekday}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {days.map((day) => (
          <span
            key={day.dateKey}
            className={`me-day me-day-${day.status}`}
            title={`${formatDateKey(day.dateKey)} · ${DAY_STATUS[day.status].label}`}
          >
            <span className="me-day-number">{day.day}</span>
            <span className="me-day-label">{DAY_STATUS[day.status].label}</span>
          </span>
        ))}
      </div>

      <div className="hrms-chips">
        {LEGEND.map((status) => (
          <Chip key={status} tone={DAY_STATUS[status].tone}>
            {DAY_STATUS[status].label} {counts[status] ?? 0}
          </Chip>
        ))}
      </div>

      <div className="me-section-head">
        <h3>Attendance history</h3>
      </div>
      {attendance.status === 'ready' && history.length === 0 && (
        <p className="hrms-muted">No punches recorded this month.</p>
      )}
      <ul className="me-history">
        {history.map((record) => {
          const status = statusFor(record.date)
          return (
            <li key={record.id}>
              <div>
                <strong>{formatDateKey(record.date)}</strong>
                <span className="hrms-muted">
                  {record.punchIn ? `In ${formatIstTime(record.punchIn)}` : 'No punch-in'}
                  {' · '}
                  {record.punchOut ? `Out ${formatIstTime(record.punchOut)}` : 'No punch-out'}
                  {record.workedMinutes != null && ` · ${formatMinutes(record.workedMinutes)}`}
                </span>
                {record.correctionReason && (
                  <span className="hrms-muted">HR correction: {record.correctionReason}</span>
                )}
              </div>
              <Chip tone={DAY_STATUS[status].tone}>{DAY_STATUS[status].label}</Chip>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
