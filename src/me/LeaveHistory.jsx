import { useState } from 'react'
import { Chip } from '../hrms/ui'
import { LEAVE_STATUS_LABELS, LEAVE_TYPES } from './constants'
import { filterLeaveHistory } from './leave'
import { formatDateKey, toIstDateKey } from './time'

const PAGE_SIZE = 5
const ALL = 'ALL'
const STATUS_TONES = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red', CANCELLED: 'neutral' }
const EMPTY_FILTERS = { type: ALL, status: ALL, search: '' }

function dayCount(value) {
  return `${value} ${value === 1 ? 'day' : 'days'}`
}

function formatRange(from, to) {
  if (from === to) return formatDateKey(from)
  return `${formatDateKey(from)} – ${formatDateKey(to)}`
}

function formatTimestamp(date) {
  return date ? formatDateKey(toIstDateKey(date)) : '—'
}

export default function LeaveHistory({ requests, employeeName, onCancel, cancellingId }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)

  function updateFilters(patch) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  const rows = filterLeaveHistory(requests, filters)
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const visible = rows.slice(start, start + PAGE_SIZE)

  return (
    <section className="dash-card me-card me-lh">
      <div className="me-section-head">
        <h3>Leave history</h3>
        <span className="me-lh-total">Total: {rows.length}</span>
      </div>

      <div className="me-lh-filters">
        <select
          className="me-select"
          aria-label="Filter by leave type"
          value={filters.type}
          onChange={(event) => updateFilters({ type: event.target.value })}
        >
          <option value={ALL}>All leave types</option>
          {LEAVE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          className="me-select"
          aria-label="Filter by status"
          value={filters.status}
          onChange={(event) => updateFilters({ status: event.target.value })}
        >
          <option value={ALL}>All statuses</option>
          {Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="search"
          className="me-lh-search"
          placeholder="Search leave history"
          aria-label="Search leave history"
          value={filters.search}
          onChange={(event) => updateFilters({ search: event.target.value })}
        />
      </div>

      {requests.length === 0 && <p className="hrms-muted">No leave requests yet.</p>}
      {requests.length > 0 && rows.length === 0 && (
        <p className="hrms-muted">No leave requests match these filters.</p>
      )}

      {visible.length > 0 && (
        <>
          <div className="me-table-wrap">
            <table className="me-table">
              <thead>
                <tr>
                  <th scope="col">Leave dates</th>
                  <th scope="col">Leave type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Requested by</th>
                  <th scope="col">Action taken on</th>
                  <th scope="col">Leave note</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((request) => {
                  const isPending = request.status === 'PENDING'
                  return (
                    <tr key={request.id}>
                      <td>
                        {formatRange(request.from, request.to)}
                        <span className="me-lh-sub">{dayCount(request.days)}</span>
                      </td>
                      <td>
                        {LEAVE_TYPES.find((type) => type.value === request.type)?.label ?? request.type}
                        <span className="me-lh-sub">Requested on {formatTimestamp(request.createdAt)}</span>
                      </td>
                      <td>
                        <Chip tone={STATUS_TONES[request.status] ?? 'neutral'}>
                          {LEAVE_STATUS_LABELS[request.status] ?? request.status}
                        </Chip>
                      </td>
                      <td>{employeeName || '—'}</td>
                      <td>{isPending ? '—' : formatTimestamp(request.updatedAt)}</td>
                      <td className="me-lh-note">{request.reason || '—'}</td>
                      <td>
                        {isPending ? (
                          <button
                            type="button"
                            className="hrms-btn-ghost"
                            onClick={() => onCancel(request.id)}
                            disabled={cancellingId === request.id}
                          >
                            {cancellingId === request.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="me-lh-pager">
            <span>
              {start + 1} to {start + visible.length} of {rows.length}
            </span>
            <div className="me-lh-pager-buttons">
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                className="hrms-btn-ghost"
                aria-label="Previous page"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </button>
              <button
                type="button"
                className="hrms-btn-ghost"
                aria-label="Next page"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
