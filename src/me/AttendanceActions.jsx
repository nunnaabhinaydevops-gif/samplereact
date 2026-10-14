import { useRef, useState } from 'react'
import { Kpi } from '../hrms/ui'
import { punchIn, punchOut } from './api'
import { WORK_LOCATIONS, workLocationLabel } from './constants'
import { useAttendanceRange, useNow } from './hooks'
import { formatIstClock, formatIstLongDate, formatIstTime, formatMinutes, shiftDateKey, toIstDateKey } from './time'

export default function AttendanceActions({ uid, policy }) {
  const now = useNow()
  const todayKey = toIstDateKey(now)
  const yesterdayKey = shiftDateKey(todayKey, -1)
  const attendance = useAttendanceRange(uid, yesterdayKey, todayKey)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const [workLocation, setWorkLocation] = useState('OFFICE')
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

  function handlePunchIn() {
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
        <div>
          <h3>Today</h3>
          <p className="hrms-muted">{formatIstLongDate(now)} · Asia/Kolkata</p>
        </div>
        <p className="me-clock" aria-live="off">
          {formatIstClock(now)}
        </p>
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

      <div className="hrms-kpis">
        <Kpi label="Punch in" value={todayRecord?.punchIn ? formatIstTime(todayRecord.punchIn) : '—'} tone="green" />
        <Kpi label="Punch out" value={todayRecord?.punchOut ? formatIstTime(todayRecord.punchOut) : '—'} tone="blue" />
        <Kpi
          label={openRecord ? 'Working so far' : 'Total working hours'}
          value={workedMinutes === null ? '—' : formatMinutes(workedMinutes)}
          tone="amber"
        />
      </div>

      <label className="hrms-field">
        Work location for this punch
        <select value={workLocation} onChange={(event) => setWorkLocation(event.target.value)} disabled={punchInDisabled}>
          {WORK_LOCATIONS.map((location) => (
            <option key={location.value} value={location.value}>
              {location.label}
            </option>
          ))}
        </select>
      </label>

      <div className="me-actions">
        <button type="button" className="hrms-btn" onClick={handlePunchIn} disabled={punchInDisabled}>
          {busy && !openRecord ? 'Punching in…' : 'Punch in'}
        </button>
        <button type="button" className="hrms-btn-ghost" onClick={handlePunchOut} disabled={punchOutDisabled}>
          {busy && openRecord ? 'Punching out…' : 'Punch out'}
        </button>
      </div>
      {policyReady && (
        <p className="hrms-muted">
          Shift {policy.data.shiftStart}–{policy.data.shiftEnd} · grace {policy.data.graceMinutes} min. Times are
          recorded by the server, not this device.
        </p>
      )}
    </section>
  )
}
