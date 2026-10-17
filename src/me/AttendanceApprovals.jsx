import { useMemo, useState } from 'react'
import { requestAttendanceApproval, reviewAttendanceApproval } from './api'
import { formatDateKey, shiftDateKey, toIstDateKey } from './time'
import { useAttendanceApprovalItems, useAttendanceRange } from './hooks'

function fromDateTimeInput(value) {
  return value ? new Date(value).toISOString() : null
}

export default function AttendanceApprovalRequests({ uid, isHr = false }) {
  const today = toIstDateKey(new Date())
  const attendance = useAttendanceRange(uid, shiftDateKey(today, -90), today)
  const approvals = useAttendanceApprovalItems(uid, false)
  const [selectedDate, setSelectedDate] = useState('')
  const [type, setType] = useState('PUNCH_CORRECTION')
  const [proposedPunchIn, setProposedPunchIn] = useState('')
  const [proposedPunchOut, setProposedPunchOut] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const records = useMemo(
    () => [...attendance.records].filter((item) => item.punchIn).sort((a, b) => b.date.localeCompare(a.date)),
    [attendance.records],
  )
  const date = selectedDate || records[0]?.date || ''
  const selectedRecord = records.find((record) => record.date === date)
  const canRequestMissingPunchOut = Boolean(selectedRecord?.punchIn && !selectedRecord.punchOut)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setFeedback({ tone: '', message: '' })
    try {
      await requestAttendanceApproval({
        date,
        type,
        reason,
        proposedPunchIn: type === 'PUNCH_CORRECTION' ? fromDateTimeInput(proposedPunchIn) : null,
        proposedPunchOut: type === 'PUNCH_CORRECTION' ? fromDateTimeInput(proposedPunchOut) : null,
      })
      setReason('')
      setProposedPunchIn('')
      setProposedPunchOut('')
      setFeedback({ tone: 'success', message: 'Attendance review request submitted to HR.' })
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message || 'Could not submit the attendance review request.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="dash-card me-card me-attendance-approvals">
      <div className="hrms-panel-head">
        <div>
          <h3>Attendance corrections &amp; reviews</h3>
          <p className="hrms-muted">Submit a punch-time correction or ask HR to review an incomplete session.</p>
        </div>
      </div>
      {attendance.status === 'error' && <p className="me-feedback is-error" role="alert">Could not load attendance records: {attendance.error}</p>}
      {approvals.status === 'error' && <p className="me-feedback is-error" role="alert">Could not load review requests: {approvals.error}</p>}
      {feedback.message && <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}

      <form className="me-approval-request-form" onSubmit={submit}>
        <label className="hrms-field">Attendance date
          <select required value={date} onChange={(event) => { setSelectedDate(event.target.value); setType('PUNCH_CORRECTION') }}>
            {records.map((record) => <option value={record.date} key={record.date}>{formatDateKey(record.date)}{record.punchOut ? '' : ' · Incomplete session'}</option>)}
          </select>
        </label>
        <label className="hrms-field">Request type
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="PUNCH_CORRECTION">Punch-time correction</option>
            {canRequestMissingPunchOut && <option value="MISSING_PUNCH_OUT">Missing punch-out review</option>}
          </select>
        </label>
        {type === 'PUNCH_CORRECTION' && (
          <>
            <label className="hrms-field">Proposed Clock In<input type="datetime-local" value={proposedPunchIn} onChange={(event) => setProposedPunchIn(event.target.value)} /></label>
            <label className="hrms-field">Proposed Clock Out<input type="datetime-local" value={proposedPunchOut} onChange={(event) => setProposedPunchOut(event.target.value)} /></label>
          </>
        )}
        <label className="hrms-field me-approval-reason">Reason<textarea required minLength="5" maxLength="300" rows="2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this attendance record needs review" /></label>
        <div className="att-config-actions">
          <button className="hrms-btn" type="submit" disabled={busy || attendance.status !== 'ready' || !date}>
            {busy ? 'Submitting…' : 'Submit for HR review'}
          </button>
        </div>
      </form>

      <div className="me-approval-request-list">
        <h4>Your requests</h4>
        {approvals.status === 'loading' && <p className="hrms-muted">Loading requests…</p>}
        {approvals.status === 'ready' && approvals.items.length === 0 && <p className="hrms-muted">No attendance review requests yet.</p>}
        {approvals.items.slice().sort((a, b) => b.date.localeCompare(a.date)).map((item) => (
          <div className="me-approval-request-row" key={item.id}>
            <span><strong>{formatDateKey(item.date)}</strong> · {item.type === 'MISSING_PUNCH_OUT' ? 'Missing punch-out review' : 'Punch-time correction'}</span>
            <span className={`hrms-chip ${item.status === 'APPROVED' ? 'hrms-chip-green' : item.status === 'PENDING' ? 'hrms-chip-amber' : ''}`}>{item.status}</span>
          </div>
        ))}
      </div>
      {isHr && <p className="hrms-muted me-approval-hr-note">As an HR user, review your own requests with a different HR/SUPER_ADMIN account.</p>}
    </section>
  )
}

export function AttendanceApprovalQueue({ state, people = [] }) {
  const [times, setTimes] = useState({})
  const [busyId, setBusyId] = useState('')
  const [feedback, setFeedback] = useState({ tone: '', message: '' })

  async function review(item, decision) {
    setBusyId(item.id)
    setFeedback({ tone: '', message: '' })
    try {
      await reviewAttendanceApproval({
        requestId: item.id,
        decision,
        correctedPunchOut: item.type === 'MISSING_PUNCH_OUT'
          ? fromDateTimeInput(times[item.id])
          : null,
      })
      setFeedback({ tone: 'success', message: `Attendance request ${decision === 'APPROVE' ? 'approved' : 'rejected'}.` })
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message || 'Could not review this attendance request.' })
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="me-stack">
      <header className="att-policy-head">
        <div><h2>Attendance Approval Queue</h2><p className="hrms-muted">Review employee corrections and incomplete punch-out sessions.</p></div>
      </header>
      <p className="hrms-muted">Only HR and SUPER_ADMIN reviewers can approve or reject requests. Employee reasons are required and auditable; missing punch-outs always need HR to enter a verified Clock Out time.</p>
      {feedback.message && <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
      {state.status === 'error' && <p className="me-feedback is-error" role="alert">Could not load approval requests: {state.error}</p>}
      <section className="dash-card me-card">
        {state.status === 'loading' && <p className="hrms-muted">Loading pending reviews…</p>}
        {state.status === 'ready' && state.items.length === 0 && <div className="att-policy-empty"><strong>Queue is clear</strong><span>Pending attendance reviews will appear here.</span></div>}
        <div className="me-approval-queue">
          {state.items.map((item) => {
            const person = people.find((entry) => entry.id === item.uid)
            return (
              <article className="me-approval-queue-item" key={item.id}>
                <div className="me-approval-queue-heading">
                  <div><strong>{person?.fullName || person?.employeeId || item.uid}</strong><span>{formatDateKey(item.date)} · {item.type === 'MISSING_PUNCH_OUT' ? 'Missing punch-out review' : 'Punch-time correction'}</span></div>
                  <span className="hrms-chip hrms-chip-amber">Pending</span>
                </div>
                <p><strong>Reason:</strong> {item.reason}</p>
                {item.type === 'PUNCH_CORRECTION' && (
                  <p className="hrms-muted">
                    Proposed Clock In: {item.proposedPunchIn?.toLocaleString() || 'No change'} · Proposed Clock Out: {item.proposedPunchOut?.toLocaleString() || 'No change'}
                  </p>
                )}
                {item.type === 'MISSING_PUNCH_OUT' && (
                  <label className="hrms-field">Verified Clock Out time
                    <input type="datetime-local" required value={times[item.id] || ''} onChange={(event) => setTimes((current) => ({ ...current, [item.id]: event.target.value }))} />
                  </label>
                )}
                <div className="att-config-actions">
                  <button type="button" className="hrms-btn" disabled={busyId === item.id || (item.type === 'MISSING_PUNCH_OUT' && !times[item.id])} onClick={() => review(item, 'APPROVE')}>{busyId === item.id ? 'Saving…' : 'Approve'}</button>
                  <button type="button" className="hrms-btn-ghost" disabled={busyId === item.id} onClick={() => review(item, 'REJECT')}>Reject</button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </section>
  )
}
