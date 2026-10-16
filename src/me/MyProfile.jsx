import { useState } from 'react'
import { Chip } from '../hrms/ui'
import { statusTone } from '../hrms/format'
import Detail from './Detail'
import MyDocuments from './MyDocuments'
import EmploymentDetails from './EmploymentDetails'
import { initialsOf } from './EmployeeProfile'
import { useUserProfile, usePhotoUrl } from './hooks'
import { formatDateKey } from './time'
import './me.css'
import './myprofile.css'

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'job', label: 'Job' },
  { id: 'documents', label: 'Documents' },
  { id: 'assets', label: 'Assets' },
]

function Field({ label, value }) {
  return (
    <div className="myprofile-field">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

function ProfileView({ user, profile }) {
  const [tab, setTab] = useState('about')
  const photoUrl = usePhotoUrl(profile.photoPath)
  const fullName = profile.fullName || user.displayName || user.email
  const isSuperAdmin = profile.role === 'SUPER_ADMIN'

  return (
    <section className="dash-card myprofile" aria-labelledby="myprofile-title">
      <div className="myprofile-banner">
        {photoUrl ? (
          <img className="myprofile-avatar" src={photoUrl} alt="" />
        ) : (
          <span className="myprofile-avatar" aria-hidden="true">
            {initialsOf(fullName)}
          </span>
        )}
        <div className="myprofile-name">
          <h2 id="myprofile-title">
            {fullName}
            {profile.employmentStatus && (
              <Chip tone={statusTone[profile.employmentStatus]}>{profile.employmentStatus}</Chip>
            )}
          </h2>
          <p>{profile.designation || 'Designation not set'}</p>
        </div>
      </div>

      <div className="myprofile-body">
        <ul className="myprofile-contact">
          <li>{profile.email || user.email}</li>
          <li>{profile.workLocation || 'Location not set'}</li>
          <li>{profile.employeeId || 'Employee ID not set'}</li>
          <li>{profile.phone || 'Phone not set'}</li>
        </ul>

        <dl className="myprofile-job">
          <Field label="Department" value={profile.department} />
          <Field label="Employment type" value={profile.employmentType} />
          <Field label="Date of joining" value={profile.dateOfJoining ? formatDateKey(profile.dateOfJoining) : ''} />
          <Field label="Reporting manager" value={profile.reportingManager} />
        </dl>
      </div>

      <nav className="me-tabs myprofile-tabs" aria-label="Profile sections">
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

      <div className="myprofile-content">
        {tab === 'about' && (
          <div className="me-grid">
            <section className="dash-card me-card">
              <div className="me-section-head">
                <h3>Personal details</h3>
              </div>
              <dl className="me-details">
                <Detail label="Full name" value={fullName} />
                <Detail label="Employee ID" value={profile.employeeId} />
                <Detail
                  label="Birthday"
                  value={profile.birthday ? formatDateKey(profile.birthday, { year: undefined }) : ''}
                />
              </dl>
            </section>
            <section className="dash-card me-card">
              <div className="me-section-head">
                <h3>Contact</h3>
              </div>
              <dl className="me-details">
                <Detail label="Email" value={profile.email || user.email} />
                <Detail label="Phone" value={profile.phone} />
                <Detail label="Address" value={profile.address} />
              </dl>
            </section>
          </div>
        )}

        {tab === 'job' && (
          <EmploymentDetails profile={profile} editable canEditRole={isSuperAdmin} />
        )}

        {tab === 'documents' && (
          <div className="me-stack">
            <MyDocuments profile={profile} hrTarget={null} viewerUid={user.uid} />
          </div>
        )}

        {tab === 'assets' && (
          <section className="dash-card me-card">
            <p className="hrms-muted">Assets are not tracked in the portal yet.</p>
          </section>
        )}
      </div>
    </section>
  )
}

export default function MyProfile({ user }) {
  const profileState = useUserProfile(user.uid)

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
    <section className="me-page">
      <ProfileView user={user} profile={profileState.profile} />
    </section>
  )
}
