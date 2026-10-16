import { useRef, useState } from 'react'
import { Kpi } from '../hrms/ui'
import { punchIn, punchOut } from './api'
import { WEEKDAY_NAMES, workLocationLabel } from './constants'
import { useAttendanceRange, useNow } from './hooks'
import {
  formatDateKey,
  formatIstClock,
  formatIstLongDate,
  formatIstTime,
  formatMinutes,
  formatTimeOfDay,
  shiftDateKey,
  toIstDateKey,
} from './time'

export default function AttendanceActions({ uid, policy }) {
  const now = useNow()
  const todayKey = toIstDateKey(now)
  const yesterdayKey = shiftDateKey(todayKey, -1)
  const attendance = useAttendanceRange(uid, yesterdayKey, todayKey)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const [showPolicy, setShowPolicy] = useState(false)
  const busyRef = useRef(false)

  const todayRecord = attendance.records.find((record) => record.date === todayKey) ?? null
  const openRecord = attendance.records.find((record) => record.punchIn && !record.punchOut) ?? null
  const punchedRecord = openRecord ?? (todayRecord?.punchIn ? todayRecord : null)
  const policyReady = policy.status === 'ready'

  let workedMinutes = null
  if (openRecord) workedMinutes = Math.floor((now - openRecord.punchIn) / 60000)
  else if (todayRecord?.workedMinutes != null) workedMinutes = todayRecord.workedMinutes

  let statusText = 'Not punched in'
  if (openRecord) statusText = `Punched in at ${formatIstTime(openRecord.punchIn)}`
  else if (todayRecord?.punchOut) statusText = 'Shift completed for today'
  else if (todayRecord?.status === 'leave') statusText = 'Marked on leave by HR'
  else if (todayRecord?.status === 'absent') statusText = 'Marked absent by HR'

  const punchInDisabled = !policyReady || busy || Boolean(openRecord) || Boolean(todayRecord?.punchIn)
  const punchOutDisabled = busy || !openRecord

  async function run(action, successMessage) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setFeedback({ tone: '', message: '' })
    try {
      const result = await action()
      setFeedback({ tone: 'success', message: successMessage(result) })
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  function handlePunchIn(workLocation) {
    return run(
      () => punchIn(workLocation),
      (result) =>
        `Punched in at ${formatIstTime(new Date(result.punchIn))} from ${workLocationLabel(result.workLocation)}${result.isLate ? ' · marked as late' : ''}.`,
    )
  }

  function handlePunchOut() {
    return run(punchOut, (result) => `Punched out at ${formatIstTime(new Date(result.punchOut))}.`)
  }

  return (
    <section className="dash-card me-card">
      <div className="me-section-head">
        <h3>Actions</h3>
      </div>

      <div className="me-clock-block">
        <p className="me-clock" aria-live="off">
          {formatIstClock(now)}
        </p>
        <p className="hrms-muted">{formatIstLongDate(now)}</p>
      </div>

      <p className="me-status">
        <span className={`me-status-dot ${openRecord ? 'is-live' : ''}`} aria-hidden="true" />
        {statusText}
        {punchedRecord && <span className="hrms-muted"> · {workLocationLabel(punchedRecord.workLocation)}</span>}
      </p>

      {policy.status === 'missing' && (
        <p className="me-feedback is-error" role="alert">
          Attendance policy is not configured yet. Ask HR to set shift timings in hrmsSettings/attendance.
        </p>
      )}
      {policy.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load attendance policy: {policy.error}
        </p>
      )}
      {attendance.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load today's attendance: {attendance.error}
        </p>
      )}
      {openRecord && openRecord.date < todayKey && (
        <p className="me-feedback is-error" role="alert">
          You still have an open punch from {openRecord.date}. Punch out to close it, or ask HR to correct it.
        </p>
      )}
      {feedback.message && (
        <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      <div className="me-action-list">
        <button type="button" className="me-action-link" onClick={() => handlePunchIn('OFFICE')} disabled={punchInDisabled}>
          {busy && !openRecord ? 'Clocking in…' : 'Clock in from office'}
        </button>
        <button type="button" className="me-action-link" onClick={() => handlePunchIn('REMOTE')} disabled={punchInDisabled}>
          Clock in remotely
        </button>
        <button type="button" className="me-action-link" onClick={handlePunchOut} disabled={punchOutDisabled}>
          {busy && openRecord ? 'Clocking out…' : 'Clock out'}
        </button>
        <button
          type="button"
          className="me-action-link"
          aria-expanded={showPolicy}
          onClick={() => setShowPolicy((open) => !open)}
        >
          {showPolicy ? 'Hide attendance policy' : 'Attendance policy'}
        </button>
      </div>

      {showPolicy && (
        <div className="me-policy">
          {policyReady ? (
            <>
              <p>
                <strong>Shift:</strong> {formatTimeOfDay(policy.data.shiftStart)} – {formatTimeOfDay(policy.data.shiftEnd)}
              </p>
              <p>
                <strong>Grace period:</strong> {policy.data.graceMinutes} min
              </p>
              <p>
                <strong>Weekly offs:</strong>{' '}
                {(policy.data.weeklyOffs ?? []).map((day) => WEEKDAY_NAMES[day]).join(', ') || 'None'}
              </p>
              <p>
                <strong>Holidays:</strong>{' '}
                {(policy.data.holidays ?? []).length === 0
                  ? 'None'
                  : (policy.data.holidays ?? [])
                      .map((holiday) => `${formatDateKey(holiday.date)} ${holiday.name}`)
                      .join(', ')}
              </p>
              <p className="hrms-muted">Times are recorded by the server, not this device.</p>
            </>
          ) : (
            <p className="hrms-muted">Shift timings and holidays appear once HR configures the policy.</p>
          )}
        </div>
      )}

      <div className="hrms-kpis">
        <Kpi label="Punch in" value={todayRecord?.punchIn ? formatIstTime(todayRecord.punchIn) : '—'} tone="green" />
        <Kpi label="Punch out" value={todayRecord?.punchOut ? formatIstTime(todayRecord.punchOut) : '—'} tone="blue" />
        <Kpi
          label={openRecord ? 'Working so far' : 'Total working hours'}
          value={workedMinutes === null ? '—' : formatMinutes(workedMinutes)}
          tone="amber"
        />
      </div>
    </section>
  )
}
