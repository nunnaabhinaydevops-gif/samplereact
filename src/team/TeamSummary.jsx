import { Fragment, useState } from 'react'
import { DAY_STATUS, deriveDayStatus } from '../me/attendanceStatus'
import { HR_ROLES, WEEKDAY_NAMES } from '../me/constants'
import {
  useApprovedLeaveRequests,
  useDirectory,
  useNow,
  usePhotoUrl,
  useSettingsDoc,
  useTeamAttendanceRange,
  useUserProfile,
} from '../me/hooks'
import {
  daysInMonthKey,
  formatDateKey,
  monthKeyOf,
  shiftDateKey,
  shiftMonthKey,
  toIstDateKey,
  weekdayOfDateKey,
} from '../me/time'
import './team.css'

const KIND_BY_STATUS = {
  leave: 'leave',
  absent: 'no-attendance',
  weekly_off: 'weekly-off',
  holiday: 'holiday',
}

const LEGEND = [
  { kind: 'wfh', label: 'Work from home' },
  { kind: 'on-duty', label: 'On duty' },
  { kind: 'leave', label: 'Paid Leave' },
  { kind: 'unpaid-leave', label: 'Unpaid Leave' },
  { kind: 'no-attendance', label: 'Leave due to No Attendance' },
  { kind: 'weekly-off', label: 'Weekly off' },
  { kind: 'holiday', label: 'Holiday' },
  { kind: 'someone-leave', label: 'Someone on Leave' },
  { kind: 'multiple-leave', label: 'Multiple Leave on a day' },
  { kind: 'someone-wfh', label: 'Someone on WFH/OD' },
]

function displayName(person) {
  return person.fullName || person.id
}

function byName(a, b) {
  return displayName(a).localeCompare(displayName(b))
}

function initialsOf(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
}

function leaveDayKeys(requests, fromKey, toKey) {
  const keys = new Set()
  for (const request of requests) {
    const lastKey = request.to < toKey ? request.to : toKey
    for (let dateKey = request.from > fromKey ? request.from : fromKey; dateKey <= lastKey; dateKey = shiftDateKey(dateKey, 1)) {
      keys.add(`${request.uid}_${dateKey}`)
    }
  }
  return keys
}

function dayFor(person, dateKey, { todayKey, records, leaveDays, holidays, weeklyOffs }) {
  if (person.dateOfJoining && dateKey < person.dateOfJoining) return null
  const key = `${person.id}_${dateKey}`
  const punch = records.get(key)
  const status = deriveDayStatus({
    dateKey,
    todayKey,
    record: leaveDays.has(key) ? { status: 'leave' } : punch,
    holidayName: holidays.get(dateKey),
    isWeeklyOff: weeklyOffs.includes(weekdayOfDateKey(dateKey)),
  })
  const remote = Boolean(punch?.punchIn) && punch.workLocation !== 'OFFICE'
  return { status, kind: KIND_BY_STATUS[status] ?? (remote ? 'wfh' : null) }
}

function PersonAvatar({ person }) {
  const photoUrl = usePhotoUrl(person.photoPath)
  if (photoUrl) return <img className="team-avatar" src={photoUrl} alt="" />
  return (
    <span className="team-avatar" aria-hidden="true">
      {initialsOf(displayName(person))}
    </span>
  )
}

function PersonList({ people, emptyText }) {
  if (people.length === 0) return <p className="hrms-muted">{emptyText}</p>
  return (
    <div className="team-people">
      {people.map((person) => (
        <div key={person.id} className="team-person">
          <PersonAvatar person={person} />
          <span className="team-person-name">{displayName(person)}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ tone, label, value }) {
  return (
    <section className={`dash-card team-stat team-stat-${tone}`}>
      <p className="team-stat-label">{label}</p>
      <p className="team-stat-value">{value}</p>
    </section>
  )
}

export default function TeamSummary({ user }) {
  const now = useNow()
  const todayKey = toIstDateKey(now)
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(todayKey))
  const profileState = useUserProfile(user.uid)
  const isHr = Boolean(profileState.profile && HR_ROLES.includes(profileState.profile.role))
  const directory = useDirectory(isHr)
  const policy = useSettingsDoc('attendance')
  const approvedLeaves = useApprovedLeaveRequests(isHr)
  const monthFrom = `${monthKey}-01`
  const monthTo = `${monthKey}-${String(daysInMonthKey(monthKey)).padStart(2, '0')}`
  const monthAttendance = useTeamAttendanceRange(isHr, monthFrom, monthTo)
  const todayAttendance = useTeamAttendanceRange(isHr, todayKey, todayKey)

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
        <p className="hrms-muted">Only HR users can view the team summary.</p>
      </section>
    )
  }

  const people = directory.items.filter((person) => person.employmentStatus !== 'Inactive').sort(byName)
  const records = new Map(
    [...monthAttendance.records, ...todayAttendance.records].map((record) => [`${record.uid}_${record.date}`, record]),
  )
  const leaveDays = new Set([
    ...leaveDayKeys(approvedLeaves.requests, monthFrom, monthTo),
    ...leaveDayKeys(approvedLeaves.requests, todayKey, todayKey),
  ])
  const holidays = new Map((policy.data?.holidays ?? []).map((holiday) => [holiday.date, holiday.name]))
  const context = { todayKey, records, leaveDays, holidays, weeklyOffs: policy.data?.weeklyOffs ?? [] }

  const days = Array.from(
    { length: daysInMonthKey(monthKey) },
    (_, index) => `${monthKey}-${String(index + 1).padStart(2, '0')}`,
  )
  const rows = people.map((person) => ({ person, cells: days.map((dateKey) => dayFor(person, dateKey, context)) }))
  const dayCounts = days.map((_, index) => ({
    leave: rows.filter((row) => row.cells[index]?.kind === 'leave').length,
    wfh: rows.filter((row) => row.cells[index]?.kind === 'wfh').length,
  }))

  const todayCells = people.map((person) => ({ person, cell: dayFor(person, todayKey, context) }))
  const onLeaveToday = todayCells.filter(({ cell }) => cell?.status === 'leave').map(({ person }) => person)
  const notInToday = todayCells.filter(({ cell }) => cell?.status === 'pending').map(({ person }) => person)
  const todayPunches = people
    .map((person) => records.get(`${person.id}_${todayKey}`))
    .filter((record) => record?.punchIn)
  const onTimeCount = todayPunches.filter((record) => !record.isLate).length
  const lateCount = todayPunches.filter((record) => record.isLate).length
  const wfhCount = todayPunches.filter((record) => record.workLocation === 'WORK_FROM_HOME').length
  const remoteCount = todayPunches.filter((record) => record.workLocation === 'REMOTE').length

  return (
    <section className="team-summary" aria-label="Team summary">
      {directory.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load staff: {directory.error}
        </p>
      )}
      {(monthAttendance.status === 'error' || approvedLeaves.status === 'error') && (
        <p className="me-feedback is-error" role="alert">
          Could not load team attendance or leave: {monthAttendance.error || approvedLeaves.error}
        </p>
      )}

      <div className="team-summary-row">
        <section className="dash-card">
          <h3 className="team-card-title">Who is on leave today</h3>
          {directory.status === 'loading' ? (
            <p className="me-state">Loading team…</p>
          ) : (
            <PersonList people={onLeaveToday} emptyText="No one is on leave today." />
          )}
        </section>
        <section className="dash-card">
          <h3 className="team-card-title">Not in yet today</h3>
          {directory.status === 'loading' ? (
            <p className="me-state">Loading team…</p>
          ) : (
            <PersonList people={notInToday} emptyText="No one is pending clock-in today." />
          )}
        </section>
      </div>

      <div className="team-stats">
        <StatCard tone="cyan" label="Employees On Time today" value={onTimeCount} />
        <StatCard tone="magenta" label="Late Arrivals today" value={lateCount} />
        <StatCard tone="olive" label="Work from Home / On Duty today" value={wfhCount} />
        <StatCard tone="yellow" label="Remote Clock-ins today" value={remoteCount} />
      </div>

      <h3 className="team-section-title">Team calendar</h3>
      <section className="dash-card team-calendar">
        <div className="team-cal-nav">
          <button
            type="button"
            className="team-nav-btn"
            aria-label="Previous month"
            onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}
          >
            ‹
          </button>
          <strong>{formatDateKey(monthFrom, { day: undefined, month: 'short', year: 'numeric' })}</strong>
          <button
            type="button"
            className="team-nav-btn"
            aria-label="Next month"
            onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}
          >
            ›
          </button>
        </div>

        {directory.status === 'loading' && <p className="me-state">Loading team…</p>}
        {directory.status === 'ready' && people.length === 0 && (
          <p className="hrms-muted">No staff yet. Add team members to see the calendar.</p>
        )}

        {people.length > 0 && (
          <div className="team-cal-scroll">
            <div className="team-cal-grid" style={{ gridTemplateColumns: `200px repeat(${days.length}, 28px)` }}>
              <span />
              {days.map((dateKey, index) => (
                <span key={dateKey} className="team-cal-head">
                  <span className="team-cal-weekday">{WEEKDAY_NAMES[weekdayOfDateKey(dateKey)].slice(0, 2)}</span>
                  <span className="team-cal-dots">
                    {dayCounts[index].leave > 1 && <span className="team-dot team-kind-multiple-leave" />}
                    {dayCounts[index].leave === 1 && <span className="team-dot team-kind-someone-leave" />}
                    {dayCounts[index].wfh > 0 && <span className="team-dot team-kind-someone-wfh" />}
                  </span>
                </span>
              ))}

              {rows.map(({ person, cells }) => (
                <Fragment key={person.id}>
                  <span className="team-cal-name">
                    <span className="team-cal-avatar" aria-hidden="true">
                      {initialsOf(displayName(person))}
                    </span>
                    <span className="team-cal-name-text">{displayName(person)}</span>
                  </span>
                  {cells.map((cell, index) => (
                    <span key={days[index]} className="team-cal-cell">
                      {cell && (
                        <span
                          className={cell.kind ? `team-day team-kind-${cell.kind}` : 'team-day'}
                          title={`${formatDateKey(days[index])} · ${DAY_STATUS[cell.status].label}`}
                        >
                          {index + 1}
                        </span>
                      )}
                    </span>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        )}

        <div className="team-legend">
          {LEGEND.map((item) => (
            <span key={item.kind} className="team-legend-item">
              <span className={`team-dot team-kind-${item.kind}`} aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      </section>
    </section>
  )
}
