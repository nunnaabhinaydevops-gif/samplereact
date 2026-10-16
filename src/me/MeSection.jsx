import { useState } from 'react'
import AttendanceActions from './AttendanceActions'
import AttendanceCorrections from './AttendanceCorrections'
import AttendanceLog from './AttendanceLog'
import AttendanceStats from './AttendanceStats'
import AttendanceTimings from './AttendanceTimings'
import Celebrations from './Celebrations'
import EmployeeProfile from './EmployeeProfile'
import EmploymentDetails from './EmploymentDetails'
import LeavePage from './LeavePage'
import MyDocuments from './MyDocuments'
import ProfileHero from './ProfileHero'
import RemoveEmployee from './RemoveEmployee'
import { HR_ROLES } from './constants'
import { useDirectory, useSettingsDoc, useUserProfile } from './hooks'
import './me.css'

const TABS = [
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
]

function nameOf(person, viewer) {
  const self = person.id === viewer.uid ? viewer : {}
  return person.fullName || self.displayName || person.email || self.email || person.id
}

export default function MeSection({ user }) {
  const [tab, setTab] = useState('attendance')
  const [managedId, setManagedId] = useState('')
  const profileState = useUserProfile(user.uid)
  const policy = useSettingsDoc('attendance')
  const profile = profileState.profile
  const isHr = Boolean(profile && HR_ROLES.includes(profile.role))
  const directory = useDirectory(isHr)
  const managed = isHr ? (directory.items.find((person) => person.id === managedId) ?? null) : null
  const isSelf = managed?.id === user.uid
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN'

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
      <ProfileHero user={user} profile={profile} tabs={TABS} activeTab={tab} onSelectTab={setTab} />

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
          {managed && !isSelf && (
            <>
              <EmployeeProfile key={managed.id} user={managed} profile={managed} managed />
              <div className="me-wide">
                <EmploymentDetails key={managed.id} profile={managed} editable canEditRole={isSuperAdmin} />
              </div>
              {isSuperAdmin && (
                <div className="me-wide">
                  <RemoveEmployee key={managed.id} person={managed} />
                </div>
              )}
            </>
          )}
          <EmployeeProfile user={user} profile={profile} />
          <EmploymentDetails
            profile={profile}
            editable={isSelf}
            canEditRole={isSelf && isSuperAdmin}
          />
          <div className="me-wide">
            <Celebrations profile={profile} isHr={isHr} />
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="me-attendance">
          <AttendanceActions uid={profile.id} policy={policy} onPartialDayRequest={() => setTab('leave')} />
          <div className="me-attendance-top">
            <AttendanceStats uid={profile.id} />
            <AttendanceTimings uid={profile.id} policy={policy} />
          </div>
          <AttendanceLog
            uid={profile.id}
            policy={policy}
            requestsSlot={
              managed ? <AttendanceCorrections key={managed.id} target={managed} viewerUid={user.uid} /> : null
            }
          />
        </div>
      )}

      {tab === 'leave' && <LeavePage uid={profile.id} employeeName={profile.fullName || profile.email} />}

      {tab === 'documents' && (
        <div className="me-stack">
          <MyDocuments profile={profile} hrTarget={managed} viewerUid={user.uid} />
        </div>
      )}
    </section>
  )
}
