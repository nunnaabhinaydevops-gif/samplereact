import { useDirectory, useSettingsDoc } from './hooks'
import { daysBetweenKeys, formatDateKey, nextAnnualDateKey, toIstDateKey, yearsBetween } from './time'

const WINDOW_DAYS = 30

function describeDays(days) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

function upcomingEvents(people, todayKey) {
  return people
    .filter((person) => person.employmentStatus !== 'Inactive')
    .flatMap((person) => {
      const name = person.fullName || person.employeeId || person.id
      const events = []
      if (person.birthday) {
        events.push({
          id: `${person.id}-birthday`,
          name,
          kind: 'Birthday',
          dateKey: nextAnnualDateKey(person.birthday, todayKey),
        })
      }
      if (person.dateOfJoining) {
        const dateKey = nextAnnualDateKey(person.dateOfJoining, todayKey)
        const years = yearsBetween(person.dateOfJoining, dateKey)
        if (years > 0) {
          events.push({
            id: `${person.id}-anniversary`,
            name,
            kind: `${years}-year work anniversary`,
            dateKey,
          })
        }
      }
      return events
    })
    .filter((event) => daysBetweenKeys(todayKey, event.dateKey) <= WINDOW_DAYS)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.name.localeCompare(b.name))
}

export default function Celebrations({ profile, isHr }) {
  const todayKey = toIstDateKey(new Date())
  const directory = useDirectory(isHr)
  const company = useSettingsDoc('company')
  const celebrationsVisible = company.data?.showCelebrations !== false

  const birthdayKey = profile.birthday ? nextAnnualDateKey(profile.birthday, todayKey) : null
  const anniversaryKey = profile.dateOfJoining ? nextAnnualDateKey(profile.dateOfJoining, todayKey) : null
  const anniversaryYears = anniversaryKey ? yearsBetween(profile.dateOfJoining, anniversaryKey) : 0

  return (
    <>
      <section className="dash-card me-card">
        <div className="me-section-head">
          <h3>My reminders</h3>
        </div>
        <ul className="me-reminders">
          <li>
            <span className="me-reminder-label">Next birthday</span>
            {birthdayKey ? (
              <span>
                <strong>{describeDays(daysBetweenKeys(todayKey, birthdayKey))}</strong> ·{' '}
                {formatDateKey(birthdayKey, { year: undefined })}
              </span>
            ) : (
              <span className="hrms-muted">Birthday not set. Ask HR to add it.</span>
            )}
          </li>
          <li>
            <span className="me-reminder-label">Work anniversary</span>
            {anniversaryKey && anniversaryYears > 0 ? (
              <span>
                <strong>{describeDays(daysBetweenKeys(todayKey, anniversaryKey))}</strong> · {anniversaryYears}{' '}
                {anniversaryYears === 1 ? 'year' : 'years'} on {formatDateKey(anniversaryKey)}
              </span>
            ) : (
              <span className="hrms-muted">
                {anniversaryKey ? 'Your first anniversary is coming up.' : 'Date of joining not set.'}
              </span>
            )}
          </li>
        </ul>
      </section>

      {isHr && (
        <section className="dash-card me-card">
          <div className="me-section-head">
            <h3>Upcoming birthdays and anniversaries</h3>
            <span className="hrms-muted">Next {WINDOW_DAYS} days · HR only</span>
          </div>
          {!celebrationsVisible && (
            <p className="hrms-muted">Celebration reminders are turned off in company settings.</p>
          )}
          {celebrationsVisible && directory.status === 'loading' && <p className="me-state">Loading directory…</p>}
          {celebrationsVisible && directory.status === 'error' && (
            <p className="me-feedback is-error" role="alert">
              Could not load the directory: {directory.error}
            </p>
          )}
          {celebrationsVisible && directory.status === 'ready' && (
            <ul className="me-event-list">
              {upcomingEvents(directory.items, todayKey).map((event) => (
                <li key={event.id}>
                  <span>
                    <strong>{event.name}</strong> · {event.kind}
                  </span>
                  <span className="hrms-muted">
                    {describeDays(daysBetweenKeys(todayKey, event.dateKey))} · {formatDateKey(event.dateKey)}
                  </span>
                </li>
              ))}
              {upcomingEvents(directory.items, todayKey).length === 0 && (
                <li className="hrms-muted">No birthdays or anniversaries in the next {WINDOW_DAYS} days.</li>
              )}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
