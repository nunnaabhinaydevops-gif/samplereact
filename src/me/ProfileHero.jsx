import { Chip } from '../hrms/ui'
import { statusTone } from '../hrms/format'
import { initialsOf } from './EmployeeProfile'
import { usePhotoUrl } from './hooks'

function Field({ label, value }) {
  return (
    <div className="me-hero-field">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

export default function ProfileHero({ user, profile, tabs, activeTab, onSelectTab }) {
  const photoUrl = usePhotoUrl(profile.photoPath)
  const fullName = profile.fullName || user.displayName || user.email
  const email = profile.email || user.email

  return (
    <section className="dash-card me-hero" aria-labelledby="me-page-title">
      <div className="me-hero-banner" aria-hidden="true" />
      <div className="me-hero-body">
        <div className="me-hero-identity">
          {photoUrl ? (
            <img className="me-hero-avatar" src={photoUrl} alt="" />
          ) : (
            <span className="me-hero-avatar" aria-hidden="true">
              {initialsOf(fullName)}
            </span>
          )}
          <div className="me-hero-name">
            <h2 id="me-page-title">
              {fullName}
              {profile.employmentStatus && (
                <Chip tone={statusTone[profile.employmentStatus]}>{profile.employmentStatus}</Chip>
              )}
            </h2>
            <p>{profile.designation || 'Designation not set'}</p>
          </div>
        </div>

        <ul className="me-hero-meta">
          <li>{email}</li>
          <li>{profile.workLocation || 'Location not set'}</li>
          <li>{profile.employeeId || 'Employee ID not set'}</li>
          <li>{profile.phone || 'Phone not set'}</li>
        </ul>

        <dl className="me-hero-info">
          <Field label="Department" value={profile.department} />
          <Field label="Designation" value={profile.designation} />
          <Field label="Employment type" value={profile.employmentType} />
          <Field label="Reporting manager" value={profile.reportingManager} />
        </dl>

        <nav className="me-tabs" aria-label="Me sections">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? 'me-tab is-active' : 'me-tab'}
              aria-current={activeTab === item.id ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </section>
  )
}
