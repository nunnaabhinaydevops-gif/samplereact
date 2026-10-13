import { useState } from 'react'
import { holidays, initialLeaveRequests, leaveBalances, leaveTypes } from './data'
import { Chip, Panel, Progress } from './ui'
import { countDays, formatDate, statusTone } from './format'

const emptyDraft = { type: leaveTypes[0], from: '', to: '' }

export default function LeaveSection() {
  const [requests, setRequests] = useState(initialLeaveRequests)
  const [draft, setDraft] = useState(emptyDraft)

  const myRequests = requests.filter((request) => request.employee === 'You')
  const teamRequests = requests.filter((request) => request.employee !== 'You')
  const teamOnLeave = teamRequests.filter((request) => request.status === 'Approved')

  const balances = leaveBalances.map((balance) => {
    const approvedDays = myRequests
      .filter((request) => request.type === balance.type && request.status === 'Approved')
      .reduce((sum, request) => sum + countDays(request.from, request.to), 0)
    const used = balance.used + approvedDays
    return { ...balance, used, percent: (used / balance.total) * 100 }
  })

  function decide(id, status) {
    setRequests((prev) => prev.map((request) => (request.id === id ? { ...request, status } : request)))
  }

  function applyLeave(event) {
    event.preventDefault()
    setRequests((prev) => [{ id: Date.now(), employee: 'You', ...draft, status: 'Pending' }, ...prev])
    setDraft((prev) => ({ ...prev, from: '', to: '' }))
  }

  return (
    <Panel title="Leave management">
      <div className="hrms-balances">
        {balances.map((balance) => (
          <div key={balance.type} className="hrms-balance">
            <div className="hrms-line-row">
              <span>{balance.type}</span>
              <strong>{balance.total - balance.used} left</strong>
            </div>
            <Progress value={balance.percent} />
            <span className="hrms-muted">
              {balance.used} of {balance.total} used
            </span>
          </div>
        ))}
      </div>

      <form className="hrms-form" onSubmit={applyLeave}>
        <label className="hrms-field">
          Leave type
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            {leaveTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="hrms-field">
          From
          <input
            type="date"
            required
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label className="hrms-field">
          To
          <input
            type="date"
            required
            min={draft.from || undefined}
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        <button type="submit" className="hrms-btn">
          Apply for leave
        </button>
      </form>

      <div className="hrms-subhead">
        <span>Team requests</span>
      </div>
      <ul className="hrms-list">
        {teamRequests.map((request) => (
          <li key={request.id}>
            <div>
              <strong>{request.employee}</strong>
              <div className="hrms-muted">
                {request.type} · {formatDate(request.from)} – {formatDate(request.to)}
              </div>
            </div>
            {request.status === 'Pending' ? (
              <div className="hrms-actions">
                <button type="button" className="hrms-btn-ghost" onClick={() => decide(request.id, 'Approved')}>
                  Approve
                </button>
                <button type="button" className="hrms-btn-ghost" onClick={() => decide(request.id, 'Rejected')}>
                  Reject
                </button>
              </div>
            ) : (
              <Chip tone={statusTone[request.status]}>{request.status}</Chip>
            )}
          </li>
        ))}
      </ul>

      <div className="hrms-subhead">
        <span>My leave history</span>
      </div>
      <ul className="hrms-list">
        {myRequests.map((request) => (
          <li key={request.id}>
            <div>
              <strong>{request.type}</strong>
              <div className="hrms-muted">
                {formatDate(request.from)} – {formatDate(request.to)}
              </div>
            </div>
            <Chip tone={statusTone[request.status]}>{request.status}</Chip>
          </li>
        ))}
      </ul>

      <div className="hrms-subhead">
        <span>Holiday calendar</span>
      </div>
      <ul className="hrms-list">
        {holidays.map((holiday) => (
          <li key={holiday.date}>
            <span>{holiday.name}</span>
            <span className="hrms-muted">{formatDate(holiday.date)}</span>
          </li>
        ))}
      </ul>

      <div className="hrms-subhead">
        <span>Team on leave</span>
      </div>
      <ul className="hrms-list">
        {teamOnLeave.length === 0 && <li className="hrms-muted">Nobody on approved leave.</li>}
        {teamOnLeave.map((request) => (
          <li key={request.id}>
            <span>{request.employee}</span>
            <span className="hrms-muted">{formatDate(request.from)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
