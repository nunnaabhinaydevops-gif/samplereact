import { useState } from 'react'
import { Chip } from '../hrms/ui'
import AttendanceCalendar from './AttendanceCalendar'
import { DAY_STATUS, deriveDayStatus } from './attendanceStatus'
import { useAttendanceRange, useNow } from './hooks'
import {
  daysInMonthKey,
  formatDateKey,
  formatIstTime,
  formatMinutes,
  monthKeyOf,
  shiftDateKey,
  shiftMonthKey,
  shiftSpanMinutes,
  toIstDateKey,
  weekdayOfDateKey,
} from './time'

const SUB_TABS = [
  { id: 'log', label: 'Attendance Log' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'requests', label: 'Attendance Requests' },
]
const LAST_30_DAYS = 'last-30-days'
const MONTH_COUNT = 6

export default function AttendanceLog({ uid, policy, requestsSlot }) {
  const now = useNow()
  const todayKey = toIstDateKey(now)
  const [tab, setTab] = useState('log')
  const [period, setPeriod] = useState(LAST_30_DAYS)
  const [hour12, setHour12] = useState(true)

  const monthKeys = Array.from({ length: MONTH_COUNT }, (_, index) =>
    shiftMonthKey(monthKeyOf(todayKey), -(index + 1)),
  )
  const isLast30 = period === LAST_30_DAYS
  const fromKey = isLast30 ? shiftDateKey(todayKey, -29) : `${period}-01`
  const toKey = isLast30 ? todayKey : `${period}-${String(daysInMonthKey(period)).padStart(2, '0')}`
  const attendance = useAttendanceRange(uid, fromKey, toKey)

  const holidays = new Map((policy.data?.holidays ?? []).map((holiday) => [holiday.date, holiday.name]))
  const weeklyOffs = policy.data?.weeklyOffs ?? []
  const policyReady = policy.status === 'ready'
  const shiftSpan = policyReady ? shiftSpanMinutes(policy.data.shiftStart, policy.data.shiftEnd) : 0
  const records = [...attendance.records].sort((a, b) => b.date.localeCompare(a.date))
  const corrections = records.filter((record) => record.correctionReason)

  function statusOf(record) {
    return deriveDayStatus({
      dateKey: record.date,
      todayKey,
      record,
      holidayName: holidays.get(record.date),
      isWeeklyOff: weeklyOffs.includes(weekdayOfDateKey(record.date)),
    })
  }

  function timeLabel(date) {
    return date ? formatIstTime(date, hour12) : '—'
  }

  function visualWidth(record) {
    if (!shiftSpan || record.workedMinutes == null) return 0
    return Math.min(record.workedMinutes / shiftSpan, 1) * 100
  }

  return (
    <section className="dash-card me-card me-logs">
      <div className="me-section-head">
        <h3>Logs &amp; Requests</h3>
        <div className="me-switch-row">
          <span id="me-24h-label">24 hour format</span>
          <button
            type="button"
            role="switch"
            aria-labelledby="me-24h-label"
            aria-checked={!hour12}
            className="me-switch"
            onClick={() => setHour12((value) => !value)}
          />
        </div>
      </div>

      <nav className="me-subtabs" aria-label="Attendance logs">
        {SUB_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'me-subtab is-active' : 'me-subtab'}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'calendar' ? (
        <div className="me-embed">
          <AttendanceCalendar uid={uid} policy={policy} />
        </div>
      ) : (
        <>
          <div className="me-period" role="group" aria-label="Period">
            <span className="me-period-label">{isLast30 ? 'Last 30 days' : 'Monthly view'}</span>
            <button
              type="button"
              className={isLast30 ? 'me-period-btn is-active' : 'me-period-btn'}
              onClick={() => setPeriod(LAST_30_DAYS)}
            >
              30 days
            </button>
            {monthKeys.map((monthKey) => (
              <button
                key={monthKey}
                type="button"
                className={period === monthKey ? 'me-period-btn is-active' : 'me-period-btn'}
                onClick={() => setPeriod(monthKey)}
              >
                {formatDateKey(`${monthKey}-01`, { day: undefined, month: 'short', year: undefined })}
              </button>
            ))}
          </div>

          {attendance.status === 'loading' && <p className="me-state">Loading attendance…</p>}
          {attendance.status === 'error' && (
            <p className="me-feedback is-error" role="alert">
              Could not load attendance: {attendance.error}
            </p>
          )}

          {tab === 'log' && (
            <>
              {attendance.status === 'ready' && records.length === 0 && (
                <p className="hrms-muted">No punches recorded in this period.</p>
              )}
              {records.length > 0 && (
                <div className="me-table-wrap">
                  <table className="me-table">
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Attendance</th>
                        <th scope="col">Hours</th>
                        <th scope="col">Punch in</th>
                        <th scope="col">Punch out</th>
                        <th scope="col">Arrival</th>
                        <th scope="col">Log</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => {
                        const status = statusOf(record)
                        return (
                          <tr key={record.id}>
                            <td>
                              {formatDateKey(record.date, { weekday: 'short', day: 'numeric', month: 'short', year: undefined })}
                            </td>
                            <td>
                              <span className="me-visual" aria-hidden="true">
                                <span className="me-visual-fill" style={{ width: `${visualWidth(record)}%` }} />
                              </span>
                            </td>
                            <td>
                              {record.workedMinutes != null
                                ? formatMinutes(record.workedMinutes)
                                : record.punchIn && !record.punchOut
                                  ? 'In progress'
                                  : '—'}
                            </td>
                            <td>{timeLabel(record.punchIn)}</td>
                            <td>{timeLabel(record.punchOut)}</td>
                            <td>{record.punchIn ? (record.isLate ? 'Late' : 'On time') : '—'}</td>
                            <td>
                              <Chip tone={DAY_STATUS[status].tone}>{DAY_STATUS[status].label}</Chip>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'requests' && (
            <>
              {attendance.status === 'ready' && corrections.length === 0 && (
                <p className="hrms-muted">No HR corrections to your attendance in this period.</p>
              )}
              {corrections.length > 0 && (
                <ul className="me-history">
                  {corrections.map((record) => (
                    <li key={record.id}>
                      <div>
                        <strong>{formatDateKey(record.date)}</strong>
                        <span className="hrms-muted">
                          In {timeLabel(record.punchIn)} · Out {timeLabel(record.punchOut)}
                        </span>
                        <span className="hrms-muted">HR correction: {record.correctionReason}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {requestsSlot && <div className="me-embed">{requestsSlot}</div>}
            </>
          )}
        </>
      )}
    </section>
  )
}
