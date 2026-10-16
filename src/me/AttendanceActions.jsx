import { useRef, useState } from 'react'
import { punchIn, punchOut } from './api'
import { MONTH_NAMES, WEEKDAY_NAMES, workLocationLabel } from './constants'
import { useAttendanceRange, useNow } from './hooks'
import {
  formatDateKey,
  formatIstClock,
  formatIstTime,
  formatMinutes,
  formatTimeOfDay,
  shiftDateKey,
  toIstDateKey,
  weekdayOfDateKey,
} from './time'

function Icon({ children }) {
  return (
    <svg className="me-icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  )
}

function QuickLink({ icon, label, ...props }) {
  return (
    <button type="button" className="me-quick-link" {...props}>
      <Icon>{icon}</Icon>
      {label}
      <Icon>
        <path d="M9 6l6 6-6 6" />
      </Icon>
    </button>
  )
}

const ICON_GLOBE = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>
)

const ICON_LAPTOP = (
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </>
)

const ICON_HOME = (
  <>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </>
)

const ICON_BUILDING = (
  <>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4" />
  </>
)

const ICON_CLOCK = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </>
)

const ICON_DOCUMENT = (
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h8" />
  </>
)

const ICON_CLOCK_OUT = (
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </>
)

const LOCATION_CHOICES = [
  { value: 'OFFICE', hint: 'On-site attendance', icon: ICON_BUILDING },
  { value: 'REMOTE', hint: 'Working remotely', icon: ICON_LAPTOP },
  { value: 'WORK_FROM_HOME', hint: 'From home location', icon: ICON_HOME },
]

export default function AttendanceActions({ uid, policy, onPartialDayRequest }) {
  const now = useNow()
  const todayKey = toIstDateKey(now)
  const yesterdayKey = shiftDateKey(todayKey, -1)
  const attendance = useAttendanceRange(uid, yesterdayKey, todayKey)
  const [workLocation, setWorkLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const [showPolicy, setShowPolicy] = useState(false)
  const busyRef = useRef(false)

  const todayRecord = attendance.records.find((record) => record.date === todayKey) ?? null
  const openRecord = attendance.records.find((record) => record.punchIn && !record.punchOut) ?? null
  const policyReady = policy.status === 'ready'
  const locked = Boolean(openRecord) || Boolean(todayRecord?.punchIn)

  const [year, month, day] = todayKey.split('-')
  const dateLabel = `${WEEKDAY_NAMES[weekdayOfDateKey(todayKey)]}, ${day} ${MONTH_NAMES[Number(month) - 1]} ${year}`
  const clock = formatIstClock(now)
  const clockTime = clock.slice(0, -2).trimEnd()
  const clockPeriod = clock.slice(-2).toUpperCase()

  let workedMinutes = null
  if (openRecord) workedMinutes = Math.floor((now - openRecord.punchIn) / 60000)
  else if (todayRecord?.workedMinutes != null) workedMinutes = todayRecord.workedMinutes

  const clockInDisabled = !policyReady || !workLocation || locked || busy
  const clockOutDisabled = busy || !openRecord

  function getBanner() {
    if (attendance.status === 'loading' || policy.status === 'loading') {
      return { tone: 'grey', title: 'Loading attendance', text: "Fetching today's record." }
    }
    if (policy.status === 'error') {
      return { tone: 'amber', title: 'Attendance pending', text: 'The attendance policy could not be loaded.' }
    }
    if (policy.status === 'missing') {
      return {
        tone: 'amber',
        title: 'Attendance pending',
        text: 'Ask HR to set shift timings in hrmsSettings/attendance before punching in.',
      }
    }
    if (openRecord && openRecord.date < todayKey) {
      return {
        tone: 'amber',
        title: 'Attendance pending',
        text: `Open punch from ${formatDateKey(openRecord.date)}. Punch out to close it, or ask HR to correct it.`,
      }
    }
    if (openRecord) {
      return {
        tone: 'green',
        title: 'Currently working',
        text: `Punched in at ${formatIstTime(openRecord.punchIn)} from ${workLocationLabel(openRecord.workLocation)}.`,
      }
    }
    if (todayRecord?.punchOut) {
      return {
        tone: 'green',
        title: 'Attendance completed',
        text: `Punched out at ${formatIstTime(todayRecord.punchOut)}. Total working hours: ${formatMinutes(todayRecord.workedMinutes ?? 0)}.`,
      }
    }
    if (todayRecord?.status === 'leave') {
      return { tone: 'grey', title: 'Marked on leave', text: 'HR has marked today as leave.' }
    }
    if (todayRecord?.status === 'absent') {
      return { tone: 'grey', title: 'Marked absent', text: 'HR has marked today as absent.' }
    }
    return {
      tone: 'green',
      title: 'Not punched in',
      text: 'Select your work location and click Clock In to start your day.',
    }
  }

  const banner = getBanner()

  async function run(action, successMessage) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setFeedback({ tone: '', message: '' })
    try {
      const result = await action()
      setFeedback({ tone: 'success', message: successMessage(result) })
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  function chooseLocation(value) {
    if (!locked) setWorkLocation(value)
  }

  function handlePunchIn() {
    return run(
      () => punchIn(workLocation),
      (result) =>
        `Punched in at ${formatIstTime(new Date(result.punchIn))} from ${workLocationLabel(result.workLocation)}${result.isLate ? ' · marked as late' : ''}.`,
    )
  }

  function handlePunchOut() {
    return run(punchOut, (result) => `Punched out at ${formatIstTime(new Date(result.punchOut))}.`)
  }

  return (
    <section className="dash-card me-card me-clock-panel">
      <div className="me-clock-body">
        <div className="me-clock-side">
          <h3 className="me-clock-heading">Current Time</h3>
          <div className="me-clock-box">
            <p className="me-clock">
              {clockTime}
              <span className="me-clock-period">{clockPeriod}</span>
            </p>
          </div>
          <p className="me-clock-date">{dateLabel}</p>

          <nav className="me-quick-links" aria-label="Attendance shortcuts">
            <QuickLink icon={ICON_GLOBE} label="Web Clock-In" onClick={() => chooseLocation('OFFICE')} />
            <QuickLink icon={ICON_LAPTOP} label="Remote Clock-In" onClick={() => chooseLocation('REMOTE')} />
            <QuickLink
              icon={ICON_HOME}
              label="Work From Home"
              onClick={() => chooseLocation('WORK_FROM_HOME')}
            />
            <QuickLink icon={ICON_CLOCK} label="Partial Day Request" onClick={onPartialDayRequest} />
            <QuickLink
              icon={ICON_DOCUMENT}
              label="Attendance Policy"
              aria-expanded={showPolicy}
              onClick={() => setShowPolicy((open) => !open)}
            />
          </nav>
        </div>

        <div className="me-clock-divider" aria-hidden="true" />

        <div className="me-clock-main">
          <h3 className="me-clock-heading">Where are you working today?</h3>
          <div className="me-location-grid" role="radiogroup" aria-label="Work location">
            {LOCATION_CHOICES.map((choice) => {
              const selected = workLocation === choice.value
              return (
                <button
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={locked}
                  className={selected ? 'me-location-card is-selected' : 'me-location-card'}
                  onClick={() => chooseLocation(choice.value)}
                >
                  <Icon>{choice.icon}</Icon>
                  <span className="me-location-title">{workLocationLabel(choice.value)}</span>
                  <span className="me-location-hint">{choice.hint}</span>
                </button>
              )
            })}
          </div>

          <div className="me-punch-panel">
            <div className="me-punch-buttons">
              <button type="button" className="me-punch-btn is-in" onClick={handlePunchIn} disabled={clockInDisabled}>
                <Icon>{ICON_CLOCK}</Icon>
                <span>
                  <span className="me-punch-title">Clock In</span>
                  <span className="me-punch-sub">Start your work day</span>
                </span>
              </button>
              <button type="button" className="me-punch-btn is-out" onClick={handlePunchOut} disabled={clockOutDisabled}>
                <Icon>{ICON_CLOCK_OUT}</Icon>
                <span>
                  <span className="me-punch-title">Clock Out</span>
                  <span className="me-punch-sub">End your work day</span>
                </span>
              </button>
            </div>

            <div className="me-kpi-row">
              <article className="me-kpi-card">
                <p className="me-kpi-label">Clock In Time</p>
                <p className="me-kpi-value">{todayRecord?.punchIn ? formatIstTime(todayRecord.punchIn) : '—'}</p>
                <p className="me-kpi-hint">
                  {todayRecord?.punchIn
                    ? todayRecord.isLate
                      ? 'Marked as late'
                      : `From ${workLocationLabel(todayRecord.workLocation)}`
                    : 'Not clocked in yet'}
                </p>
              </article>
              <article className="me-kpi-card">
                <p className="me-kpi-label">Clock Out Time</p>
                <p className="me-kpi-value">{todayRecord?.punchOut ? formatIstTime(todayRecord.punchOut) : '—'}</p>
                <p className="me-kpi-hint">{todayRecord?.punchOut ? 'Shift ended' : 'Not clocked out yet'}</p>
              </article>
              <article className="me-kpi-card">
                <p className="me-kpi-label">Total Working Hours</p>
                <p className="me-kpi-value">{workedMinutes === null ? '—' : formatMinutes(workedMinutes)}</p>
                <p className="me-kpi-hint">
                  {openRecord
                    ? 'Counting since clock in'
                    : todayRecord?.punchOut
                      ? 'Final duration'
                      : 'Starts after clock in'}
                </p>
              </article>
            </div>
          </div>
        </div>
      </div>

      {showPolicy && (
        <div className="me-policy">
          {policyReady ? (
            <>
              <p>
                <strong>Shift:</strong> {formatTimeOfDay(policy.data.shiftStart)} – {formatTimeOfDay(policy.data.shiftEnd)}
              </p>
              <p>
                <strong>Grace period:</strong> {policy.data.graceMinutes} min
              </p>
              <p>
                <strong>Weekly offs:</strong>{' '}
                {(policy.data.weeklyOffs ?? []).map((day) => WEEKDAY_NAMES[day]).join(', ') || 'None'}
              </p>
              <p>
                <strong>Holidays:</strong>{' '}
                {(policy.data.holidays ?? []).length === 0
                  ? 'None'
                  : (policy.data.holidays ?? [])
                      .map((holiday) => `${formatDateKey(holiday.date)} ${holiday.name}`)
                      .join(', ')}
              </p>
              <p className="hrms-muted">Times are recorded by the server, not this device.</p>
            </>
          ) : (
            <p className="hrms-muted">Shift timings and holidays appear once HR configures the policy.</p>
          )}
        </div>
      )}

      {policy.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load attendance policy: {policy.error}
        </p>
      )}
      {attendance.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load today's attendance: {attendance.error}
        </p>
      )}
      {feedback.message && (
        <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      <div className={`me-banner is-${banner.tone}`} role="status">
        <span className="me-banner-dot" aria-hidden="true" />
        <div>
          <p className="me-banner-title">{banner.title}</p>
          {banner.text && <p className="me-banner-text">{banner.text}</p>}
        </div>
      </div>
    </section>
  )
}
