import { useState } from 'react'
import AttendanceActions from './AttendanceActions'
import AttendanceCalendar from './AttendanceCalendar'
import AttendanceCorrections from './AttendanceCorrections'
import Celebrations from './Celebrations'
import EmployeeProfile from './EmployeeProfile'
import EmploymentDetails from './EmploymentDetails'
import MyDocuments from './MyDocuments'
import { HR_ROLES } from './constants'
import { useDirectory, useSettingsDoc, useUserProfile } from './hooks'
import './me.css'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'documents', label: 'Documents' },
]

function nameOf(person, viewer) {
  const self = person.id === viewer.uid ? viewer : {}
  return person.fullName || self.displayName || person.email || self.email || person.id
}

export default function MeSection({ user }) {
  const [tab, setTab] = useState('overview')
  const [managedId, setManagedId] = useState('')
  const profileState = useUserProfile(user.uid)
  const policy = useSettingsDoc('attendance')
  const profile = profileState.profile
  const isHr = Boolean(profile && HR_ROLES.includes(profile.role))
  const directory = useDirectory(isHr)
  const managed = isHr ? (directory.items.find((person) => person.id === managedId) ?? null) : null

  if (profileState.status === 'loading') {
    return (
      <section className="me-page">
        <p className="me-state">Loading your profile…</p>
      </section>
    )
  }

  if (profileState.status === 'error') {
    return (
      <section className="me-page">
        <p className="me-feedback is-error" role="alert">
          Could not load your profile: {profileState.error}
        </p>
      </section>
    )
  }

  if (profileState.status === 'missing') {
    return (
      <section className="me-page">
        <div className="dash-card me-card">
          <div className="me-section-head">
            <h3>Profile not set up</h3>
          </div>
          <p className="hrms-muted">
            No employee record exists for your sign-in yet. Ask HR to create a record in the users collection using
            this user ID:
          </p>
          <code className="me-code">{user.uid}</code>
        </div>
      </section>
    )
  }

  return (
    <section className="me-page" aria-labelledby="me-page-title">
      <header className="me-page-head">
        <div>
          <h2 id="me-page-title">Me</h2>
          <p className="hrms-muted">Your profile, attendance and documents</p>
        </div>
        <nav className="me-tabs" aria-label="Me sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'me-tab is-active' : 'me-tab'}
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {isHr && (
        <section className="dash-card me-card">
          <label className="hrms-field">
            HR · Manage employee
            <select value={managedId} onChange={(event) => setManagedId(event.target.value)}>
              <option value="">Select an employee</option>
              {[...directory.items]
                .sort((a, b) => nameOf(a, user).localeCompare(nameOf(b, user)))
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {nameOf(person, user)}
                    {person.employeeId ? ` · ${person.employeeId}` : ''}
                  </option>
                ))}
            </select>
          </label>
          {directory.status === 'error' && (
            <p className="me-feedback is-error" role="alert">
              Could not load the employee directory: {directory.error}
            </p>
          )}
        </section>
      )}

      {tab === 'overview' && (
        <div className="me-grid">
          {managed && (
            <>
              <EmployeeProfile key={managed.id} user={managed} profile={managed} readOnly />
              <div className="me-wide">
                <EmploymentDetails
                  key={managed.id}
                  profile={managed}
                  editable
                  canEditRole={profile.role === 'SUPER_ADMIN'}
                />
              </div>
            </>
          )}
          <EmployeeProfile user={user} profile={profile} />
          <EmploymentDetails profile={profile} editable={false} canEditRole={false} />
          <div className="me-wide">
            <Celebrations profile={profile} isHr={isHr} />
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="me-grid">
          <AttendanceActions uid={profile.id} policy={policy} />
          <div className="me-wide">
            <AttendanceCalendar uid={profile.id} policy={policy} />
          </div>
          {managed && (
            <div className="me-wide">
              <AttendanceCorrections key={managed.id} target={managed} viewerUid={user.uid} />
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="me-stack">
          <MyDocuments profile={profile} hrTarget={managed} viewerUid={user.uid} />
        </div>
      )}
    </section>
  )
}
