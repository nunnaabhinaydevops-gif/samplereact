import { useState } from 'react'
import { Panel } from '../hrms/ui'
import { restoreEmployee } from '../me/api'
import { useDirectory } from '../me/hooks'

function removedOn(timestamp) {
  return (
    timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) ?? '—'
  )
}

export default function DeletedStaffList() {
  const directory = useDirectory(true, 'deletedUsers')
  const [restoringId, setRestoringId] = useState('')
  const [error, setError] = useState('')

  const items = [...directory.items].sort(
    (a, b) => (b.deletedAt?.toMillis() ?? 0) - (a.deletedAt?.toMillis() ?? 0),
  )

  async function handleRestore(person) {
    setRestoringId(person.id)
    setError('')
    try {
      await restoreEmployee(person.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setRestoringId('')
    }
  }

  return (
    <Panel title="Deleted employees" className="hrms-wide">
      {error && (
        <p className="me-feedback is-error" role="alert">
          {error}
        </p>
      )}
      {directory.status === 'loading' && <p className="me-state">Loading deleted employees…</p>}
      {directory.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load deleted employees: {directory.error}
        </p>
      )}
      {directory.status === 'ready' && items.length === 0 && <p className="hrms-muted">No deleted employees.</p>}

      {items.length > 0 && (
        <div className="hrms-table-wrap">
          <table className="hrms-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Removed on</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((person) => (
                <tr key={person.id}>
                  <td>
                    <strong>{person.fullName || person.id}</strong>
                    {person.email && <div className="hrms-muted">{person.email}</div>}
                  </td>
                  <td>{person.employeeId || '—'}</td>
                  <td>{person.department || '—'}</td>
                  <td>{person.designation || '—'}</td>
                  <td>{removedOn(person.deletedAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="hrms-btn-ghost"
                      onClick={() => handleRestore(person)}
                      disabled={restoringId !== ''}
                    >
                      {restoringId === person.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
