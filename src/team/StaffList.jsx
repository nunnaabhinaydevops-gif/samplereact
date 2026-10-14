import { useState } from 'react'
import { Chip, Panel } from '../hrms/ui'
import { formatDate, statusTone } from '../hrms/format'
import { HR_ROLES } from '../me/constants'
import { useDirectory, useUserProfile } from '../me/hooks'
import AddStaffForm from './AddStaffForm'
import DeletedStaffList from './DeletedStaffList'
import './team.css'

function byName(a, b) {
  return (a.fullName || a.id).localeCompare(b.fullName || b.id)
}

function matchesQuery(person, query) {
  return [person.fullName, person.email, person.employeeId, person.department, person.designation]
    .some((value) => value?.toLowerCase().includes(query))
}

export default function StaffList({ user }) {
  const profileState = useUserProfile(user.uid)
  const isHr = Boolean(profileState.profile && HR_ROLES.includes(profileState.profile.role))
  const directory = useDirectory(isHr)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  if (profileState.status === 'loading') {
    return (
      <section className="me-page">
        <p className="me-state">Loading your profile…</p>
      </section>
    )
  }

  if (!isHr) {
    return (
      <section className="me-page">
        <p className="hrms-muted">Only HR users can view and add staff.</p>
      </section>
    )
  }

  const isSuperAdmin = profileState.profile.role === 'SUPER_ADMIN'
  const normalizedQuery = query.trim().toLowerCase()
  const staff = directory.items
    .filter((person) => !normalizedQuery || matchesQuery(person, normalizedQuery))
    .sort(byName)

  const addButton = adding ? null : (
    <button type="button" className="hrms-btn" onClick={() => setAdding(true)}>
      Add staff
    </button>
  )

  return (
    <section className="me-page" aria-label="My team">
      <Panel title="Staff List" action={addButton} className="hrms-wide">
        {adding && <AddStaffForm onClose={() => setAdding(false)} />}

        <div className="team-toolbar">
          <label className="team-search">
            <span className="visually-hidden">Search staff</span>
            <input
              type="search"
              placeholder="Search staff"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <span className="hrms-muted">({directory.items.length} Staff)</span>
        </div>

        {directory.status === 'loading' && <p className="me-state">Loading staff…</p>}
        {directory.status === 'error' && (
          <p className="me-feedback is-error" role="alert">
            Could not load staff: {directory.error}
          </p>
        )}
        {directory.status === 'ready' && staff.length === 0 && (
          <p className="hrms-muted">
            {directory.items.length === 0 ? 'No staff yet. Add the first staff member.' : 'No staff match your search.'}
          </p>
        )}

        {staff.length > 0 && (
          <div className="hrms-table-wrap">
            <table className="hrms-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Reporting manager</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <strong>{person.fullName || person.id}</strong>
                      {person.email && <div className="hrms-muted">{person.email}</div>}
                    </td>
                    <td>{person.employeeId || '—'}</td>
                    <td>{person.department || '—'}</td>
                    <td>{person.designation || '—'}</td>
                    <td>{person.reportingManager || '—'}</td>
                    <td>{person.dateOfJoining ? formatDate(person.dateOfJoining) : '—'}</td>
                    <td>
                      {person.employmentStatus ? (
                        <Chip tone={statusTone[person.employmentStatus]}>{person.employmentStatus}</Chip>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {isSuperAdmin && <DeletedStaffList />}
    </section>
  )
}
