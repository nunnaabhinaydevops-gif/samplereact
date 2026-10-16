import { useState } from 'react'
import { cancelLeave, requestLeave } from './api'
import { LEAVE_TYPES } from './constants'
import { useLeaveRequests, useNow } from './hooks'
import LeaveStats from './LeaveStats'
import { summarizeLeave } from './leave'
import { formatDateKey, toIstDateKey } from './time'

const EMPTY_DRAFT = { type: LEAVE_TYPES[0].value, from: '', to: '', reason: '' }

function typeLabelOf(value) {
  return LEAVE_TYPES.find((type) => type.value === value)?.label ?? value
}

function dayCount(value) {
  return `${value} ${value === 1 ? 'day' : 'days'}`
}

export default function LeavePage({ uid }) {
  const now = useNow()
  const currentYear = Number(toIstDateKey(now).slice(0, 4))
  const [year, setYear] = useState(currentYear)
  const leave = useLeaveRequests(uid)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [busy, setBusy] = useState(false)
  const [cancellingId, setCancellingId] = useState('')
  const [feedback, setFeedback] = useState({ tone: '', message: '' })

  const requests = leave.requests
  const pending = requests
    .filter((request) => request.status === 'PENDING')
    .sort((a, b) => a.from.localeCompare(b.from))
  const summary = summarizeLeave(requests, year)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setFeedback({ tone: '', message: '' })
    try {
      const result = await requestLeave(draft)
      setFeedback({ tone: 'success', message: `Leave request submitted for ${dayCount(result.days)}.` })
      setDraft(EMPTY_DRAFT)
      setShowForm(false)
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel(id) {
    setCancellingId(id)
    setFeedback({ tone: '', message: '' })
    try {
      await cancelLeave(id)
      setFeedback({ tone: 'success', message: 'Leave request cancelled.' })
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setCancellingId('')
    }
  }

  return (
    <div className="me-leave">
      {leave.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load leave requests: {leave.error}
        </p>
      )}
      {feedback.message && (
        <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      <div className="me-leave-toolbar">
        <select
          className="me-select"
          aria-label="Leave year"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
        >
          {[currentYear - 1, currentYear].map((option) => (
            <option key={option} value={option}>
              {`Jan ${option} - Dec ${option}`}
            </option>
          ))}
        </select>
      </div>

      <div className="me-leave-top">
        <section className="dash-card me-card">
          <div className="me-section-head">
            <h3>Pending leave requests</h3>
          </div>
          {leave.status === 'loading' && <p className="hrms-muted">Loading leave requests…</p>}
          {leave.status === 'ready' && pending.length === 0 && (
            <div className="me-leave-empty">
              <span className="me-leave-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12.5l2.5 2.5L16 9.5" />
                </svg>
              </span>
              <div>
                <strong>Hurray! No pending leave requests</strong>
                <p className="hrms-muted">Request leave using the button on the right.</p>
              </div>
            </div>
          )}
          {pending.length > 0 && (
            <ul className="me-leave-list">
              {pending.map((request) => (
                <li key={request.id} className="me-leave-item">
                  <div>
                    <strong>{typeLabelOf(request.type)}</strong>
                    <span className="hrms-muted">
                      {formatDateKey(request.from)}
                      {request.to !== request.from ? ` – ${formatDateKey(request.to)}` : ''} · {dayCount(request.days)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="hrms-btn-ghost"
                    onClick={() => handleCancel(request.id)}
                    disabled={cancellingId === request.id}
                  >
                    {cancellingId === request.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-card me-card me-leave-request">
          {showForm ? (
            <form className="me-leave-form" onSubmit={handleSubmit}>
              <label className="hrms-field">
                Leave type
                <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
                  {LEAVE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="hrms-field">
                From
                <input
                  type="date"
                  required
                  value={draft.from}
                  onChange={(event) => setDraft({ ...draft, from: event.target.value })}
                />
              </label>
              <label className="hrms-field">
                To
                <input
                  type="date"
                  required
                  min={draft.from || undefined}
                  value={draft.to}
                  onChange={(event) => setDraft({ ...draft, to: event.target.value })}
                />
              </label>
              <label className="hrms-field">
                Reason (optional)
                <textarea
                  rows={3}
                  maxLength={300}
                  value={draft.reason}
                  onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
                />
              </label>
              <div className="me-leave-form-actions">
                <button type="submit" className="hrms-btn" disabled={busy}>
                  {busy ? 'Submitting…' : 'Submit request'}
                </button>
                <button type="button" className="hrms-btn-ghost" onClick={() => setShowForm(false)} disabled={busy}>
                  Close
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="me-leave-request-btn" onClick={() => setShowForm(true)}>
              Request Leave
            </button>
          )}
        </section>
      </div>

      <h3 className="me-leave-section-title">My leave stats</h3>
      <LeaveStats summary={summary} />

      <h3 className="me-leave-section-title">Leave balances</h3>
      <div className="me-leave-balances">
        {LEAVE_TYPES.map((type) => {
          const used = summary.used[type.value]
          const pendingDays = summary.pending[type.value]
          const left = Math.max(type.allowance - used - pendingDays, 0)
          const percent = Math.min((used / type.allowance) * 100, 100)
          return (
            <section key={type.value} className="dash-card me-card">
              <div className="me-section-head">
                <h3>{type.label}</h3>
                <strong>{left} left</strong>
              </div>
              <div className="me-progress" aria-hidden="true">
                <span style={{ width: `${percent}%`, background: type.color }} />
              </div>
              <p className="hrms-muted">
                {used} of {type.allowance} used in {year}
                {pendingDays > 0 ? ` · ${pendingDays} pending` : ''}
              </p>
            </section>
          )
        })}
      </div>
    </div>
  )
}
