import { DAY_STATUS, deriveDayStatus } from './attendanceStatus'
import { useAttendanceRange, useNow } from './hooks'
import {
  formatDateKey,
  formatMinutes,
  formatTimeOfDay,
  mondayOfDateKey,
  minuteOfShiftStartOffset,
  shiftDateKey,
  shiftSpanMinutes,
  toIstDateKey,
  weekdayOfDateKey,
} from './time'

const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function percentOnShift(offset, span) {
  return Math.min(Math.max(offset / span, 0), 1) * 100
}

export default function AttendanceTimings({ uid, policy }) {
  const now = useNow()
  const todayKey = toIstDateKey(now)
  const weekStart = mondayOfDateKey(todayKey)
  const weekDays = Array.from({ length: 7 }, (_, index) => shiftDateKey(weekStart, index))
  const attendance = useAttendanceRange(uid, weekStart, weekDays[6])

  const recordsByDate = new Map(attendance.records.map((record) => [record.date, record]))
  const holidays = new Map((policy.data?.holidays ?? []).map((holiday) => [holiday.date, holiday.name]))
  const weeklyOffs = policy.data?.weeklyOffs ?? []
  const statusOf = (dateKey) =>
    deriveDayStatus({
      dateKey,
      todayKey,
      record: recordsByDate.get(dateKey),
      holidayName: holidays.get(dateKey),
      isWeeklyOff: weeklyOffs.includes(weekdayOfDateKey(dateKey)),
    })

  const todayRecord = recordsByDate.get(todayKey) ?? null
  const policyReady = policy.status === 'ready'
  const span = policyReady ? shiftSpanMinutes(policy.data.shiftStart, policy.data.shiftEnd) : 0
  const punchInAt = todayRecord?.punchIn ?? null
  const punchEnd = todayRecord?.punchOut ?? (punchInAt ? now : null)
  const shiftStart = policyReady ? policy.data.shiftStart : null
  const fillStart = policyReady && punchInAt ? percentOnShift(minuteOfShiftStartOffset(punchInAt, shiftStart), span) : 0
  const fillEnd = policyReady && punchEnd ? percentOnShift(minuteOfShiftStartOffset(punchEnd, shiftStart), span) : 0
  let workedLabel = '—'
  if (todayRecord?.workedMinutes != null) workedLabel = formatMinutes(todayRecord.workedMinutes)
  else if (punchInAt) workedLabel = 'In progress'

  return (
    <section className="dash-card me-card">
      <div className="me-section-head">
        <h3>Timings</h3>
      </div>

      {attendance.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load this week: {attendance.error}
        </p>
      )}

      <div className="me-week" role="list" aria-label="This week">
        {weekDays.map((dateKey, index) => {
          const tone = DAY_STATUS[statusOf(dateKey)].tone
          return (
            <span
              key={dateKey}
              role="listitem"
              className={dateKey === todayKey ? 'me-week-day is-today' : 'me-week-day'}
              title={`${formatDateKey(dateKey)} · ${DAY_STATUS[statusOf(dateKey)].label}`}
            >
              {WEEK_LETTERS[index]}
              <span className={`me-dot me-dot-${tone}`} aria-hidden="true" />
            </span>
          )
        })}
      </div>

      {policyReady ? (
        <>
          <p className="me-timing-label">
            Today ({formatTimeOfDay(policy.data.shiftStart)} – {formatTimeOfDay(policy.data.shiftEnd)})
          </p>
          <div className="me-timeline" aria-hidden="true">
            {punchInAt && (
              <span
                className="me-timeline-fill"
                style={{ left: `${fillStart}%`, width: `${Math.max(fillEnd - fillStart, 0)}%` }}
              />
            )}
          </div>
          <div className="me-timing-meta">
            <span>Duration: {formatMinutes(span)}</span>
            <span>Worked: {workedLabel}</span>
          </div>
        </>
      ) : (
        <p className="hrms-muted">Shift timings appear once HR configures the attendance policy.</p>
      )}
    </section>
  )
}
