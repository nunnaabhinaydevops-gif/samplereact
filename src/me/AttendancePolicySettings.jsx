import { useMemo, useState } from 'react'
import { saveAttendancePolicy } from './api'

const WEEKDAYS = [
  ['Monday', 1],
  ['Tuesday', 2],
  ['Wednesday', 3],
  ['Thursday', 4],
  ['Friday', 5],
  ['Saturday', 6],
  ['Sunday', 0],
]

const SUGGESTED_TIME_ZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore']
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

function availableTimeZones(currentValue) {
  const supported = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : SUGGESTED_TIME_ZONES
  return [...new Set(['UTC', ...supported, ...SUGGESTED_TIME_ZONES, currentValue].filter(Boolean))].sort()
}

function isValidDateKey(value) {
  if (!DATE_KEY.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function policyValues(data) {
  return {
    weeklyOffs: Array.isArray(data?.weeklyOffs) ? [...data.weeklyOffs].sort((a, b) => a - b) : [],
    holidays: (Array.isArray(data?.holidays) ? data.holidays : [])
      .filter((holiday) => holiday && typeof holiday.date === 'string' && typeof holiday.name === 'string')
      .map(({ date, name }) => ({ date, name })),
    timeZone: typeof data?.timeZone === 'string' ? data.timeZone : 'Asia/Kolkata',
    defaultAttendanceMode: data?.defaultAttendanceMode === 'REMOTE_FIELD' ? 'REMOTE_FIELD' : 'FLEXIBLE',
    defaultWorkingMinutes: Number.isInteger(data?.defaultWorkingMinutes) ? data.defaultWorkingMinutes : 0,
    defaultBreakMinutes: Number.isInteger(data?.defaultBreakMinutes) ? data.defaultBreakMinutes : 0,
    locationRequired: data?.locationRequired === true,
    allowRemoteAttendance: data?.allowRemoteAttendance !== false,
    correctionWindowDays: Number.isInteger(data?.correctionWindowDays) ? data.correctionWindowDays : 90,
  }
}

function sameValues(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function formatHolidayDate(date) {
  if (!isValidDateKey(date)) return date
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

function formatUpdatedAt(value, timeZone) {
  const date = value?.toDate?.()
  if (!date || Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }
}

function Icon({ name, size = 18 }) {
  const paths = {
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2.9Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
  }

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function getSaveError(error) {
  const code = error?.code?.replace(/^functions\//, '')
  if (code === 'permission-denied') return 'You do not have permission to update organization attendance settings.'
  if (code === 'unauthenticated') return 'Your session has expired. Sign in again before saving.'
  if (['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code)) {
    return 'The service could not be reached. Check your connection and try again.'
  }
  if (code === 'invalid-argument' || code === 'failed-precondition') {
    return error.message || 'Some attendance settings are invalid. Review the highlighted fields.'
  }
  return error?.message || 'Could not save attendance settings. Please try again.'
}

function AttendancePolicyForm({ policy, section }) {
  const initialValues = policyValues(policy.data)
  const [values, setValues] = useState(initialValues)
  const [savedValues, setSavedValues] = useState(initialValues)
  const [draftDate, setDraftDate] = useState('')
  const [draftName, setDraftName] = useState('')
  const [editingDate, setEditingDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const [errors, setErrors] = useState({})
  const timeZones = useMemo(() => availableTimeZones(values.timeZone), [values.timeZone])
  const hasDraft = Boolean(draftDate || draftName || editingDate)
  const hasChanges = !sameValues(values, savedValues) || hasDraft
  const updatedAt = formatUpdatedAt(policy.data?.updatedAt, values.timeZone)
  const showGeneral = section !== 'calendar'
  const showCalendar = section !== 'general'

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setFeedback({ tone: '', message: '' })
  }

  function updateDraft(name, value) {
    if (name === 'date') setDraftDate(value)
    else setDraftName(value)
    setErrors((current) => ({ ...current, [name]: '' }))
    setFeedback({ tone: '', message: '' })
  }

  function toggleWeekday(day) {
    const weeklyOffs = values.weeklyOffs.includes(day)
      ? values.weeklyOffs.filter((item) => item !== day)
      : [...values.weeklyOffs, day]
    update('weeklyOffs', weeklyOffs.sort((a, b) => a - b))
  }

  function clearHolidayDraft() {
    setDraftDate('')
    setDraftName('')
    setEditingDate('')
    setErrors((current) => ({ ...current, date: '', name: '' }))
  }

  function addHoliday() {
    const nextErrors = {}
    if (!isValidDateKey(draftDate)) nextErrors.date = 'Choose a valid holiday date.'
    if (!draftName.trim()) nextErrors.name = 'Enter a holiday name.'
    else if (draftName.trim().length > 100) nextErrors.name = 'Holiday name must be 100 characters or fewer.'
    const duplicate = values.holidays.some((holiday) =>
      holiday.date === draftDate && holiday.date !== editingDate)
    if (duplicate) nextErrors.date = 'A holiday is already configured for this date.'
    if (values.holidays.length >= 100 && !editingDate) {
      nextErrors.date = 'You can configure up to 100 holidays.'
    }
    setErrors((current) => ({ ...current, ...nextErrors }))
    if (Object.keys(nextErrors).length) return

    const holiday = { date: draftDate, name: draftName.trim() }
    const holidays = editingDate
      ? values.holidays.map((item) => item.date === editingDate ? holiday : item)
      : [...values.holidays, holiday]
    update('holidays', holidays.sort((a, b) => a.date.localeCompare(b.date)))
    clearHolidayDraft()
  }

  function editHoliday(holiday) {
    setDraftDate(holiday.date)
    setDraftName(holiday.name)
    setEditingDate(holiday.date)
    setErrors((current) => ({ ...current, date: '', name: '' }))
  }

  function deleteHoliday(date) {
    update('holidays', values.holidays.filter((holiday) => holiday.date !== date))
    if (editingDate === date) clearHolidayDraft()
  }

  function resetChanges() {
    setValues({ ...savedValues, weeklyOffs: [...savedValues.weeklyOffs], holidays: savedValues.holidays.map((holiday) => ({ ...holiday })) })
    clearHolidayDraft()
    setErrors({})
    setFeedback({ tone: '', message: '' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    const timeZone = values.timeZone.trim()
    try {
      if (!timeZones.includes(timeZone)) throw new RangeError('Unsupported time zone')
      new Intl.DateTimeFormat('en', { timeZone }).format()
    } catch {
      nextErrors.timeZone = 'Choose a valid IANA time zone from the suggestions.'
    }
    for (const [field, label] of [
      ['defaultWorkingMinutes', 'Default working-hours target'],
      ['defaultBreakMinutes', 'Default break deduction'],
      ['correctionWindowDays', 'Correction request window'],
    ]) {
      const value = Number(values[field])
      const minimum = field === 'correctionWindowDays' ? 1 : 0
      const maximum = field === 'correctionWindowDays' ? 365 : 1440
      if (!Number.isInteger(value) || value < minimum || value > maximum) {
        nextErrors[field] = `${label} must be a whole number from ${minimum} to ${maximum}.`
      }
    }
    if (hasDraft) {
      if (!isValidDateKey(draftDate)) nextErrors.date = 'Choose a valid holiday date.'
      if (!draftName.trim()) nextErrors.name = 'Enter a holiday name.'
      else if (draftName.trim().length > 100) nextErrors.name = 'Holiday name must be 100 characters or fewer.'
      if (values.holidays.some((holiday) => holiday.date === draftDate && holiday.date !== editingDate)) {
        nextErrors.date = 'A holiday is already configured for this date.'
      }
    }
    if (
      values.holidays.length > 100 ||
      values.holidays.some(({ date, name }) => !isValidDateKey(date) || !name.trim() || name.trim().length > 100) ||
      new Set(values.holidays.map(({ date }) => date)).size !== values.holidays.length
    ) {
      nextErrors.form = 'Review the holiday list. Each entry needs a valid date and a unique date.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setFeedback({ tone: 'error', message: 'Review the highlighted settings before saving.' })
      return
    }

    setBusy(true)
    setFeedback({ tone: '', message: '' })
    const payload = {
      weeklyOffs: [...values.weeklyOffs].sort((a, b) => a - b),
      holidays: values.holidays.map(({ date, name }) => ({ date, name: name.trim() }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      timeZone,
      defaultAttendanceMode: values.defaultAttendanceMode,
      defaultWorkingMinutes: Number(values.defaultWorkingMinutes),
      defaultBreakMinutes: Number(values.defaultBreakMinutes),
      locationRequired: values.locationRequired,
      allowRemoteAttendance: values.allowRemoteAttendance,
      correctionWindowDays: Number(values.correctionWindowDays),
    }
    try {
      await saveAttendancePolicy(payload)
      setValues(payload)
      setSavedValues(payload)
      clearHolidayDraft()
      setFeedback({ tone: 'success', message: 'Attendance policy saved successfully.' })
    } catch (error) {
      setFeedback({ tone: 'error', message: getSaveError(error) })
    } finally {
      setBusy(false)
    }
  }

  const configured =
    policy.status === 'ready' &&
    typeof policy.data?.timeZone === 'string' &&
    Array.isArray(policy.data?.weeklyOffs) &&
    Array.isArray(policy.data?.holidays)
  const statusText = configured ? 'Configured' : 'Setup Required'

  return (
    <section className="dash-card me-card me-policy-settings" aria-labelledby="attendance-policy-title">
      <header className="me-policy-header">
        <div className="me-policy-heading">
          <nav className="me-policy-breadcrumb" aria-label="Breadcrumb">
            <span>HR</span><span aria-hidden="true">/</span><span>Settings</span><span aria-hidden="true">/</span><span>Attendance &amp; Shift Configuration</span>
          </nav>
          <div className="me-policy-title-row">
            <div className="me-policy-title-icon"><Icon name="clock" size={20} /></div>
            <div>
              <h2 id="attendance-policy-title">{section === 'calendar' ? 'Weekly Off & Holiday Settings' : 'General Attendance Settings'}</h2>
              <p>Configure organization defaults for schedules, time zones, weekly offs, holidays, and review windows without assigning an implicit shift.</p>
            </div>
          </div>
          <div className="me-policy-meta">
            <span className={`me-policy-status ${configured ? 'is-configured' : ''}`}><span />{statusText}</span>
            {updatedAt && <span className="me-policy-updated"><Icon name="clock" size={14} /> Last updated {updatedAt}</span>}
          </div>
        </div>
        <div className="me-policy-header-actions">
          <button className="me-policy-button is-secondary" type="button" onClick={resetChanges} disabled={busy || !hasChanges}>
            Reset changes
          </button>
          <button className="me-policy-button is-primary" type="submit" form="attendance-policy-form" disabled={busy || !hasChanges}>
            {busy && <span className="me-policy-spinner" aria-hidden="true" />}
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </header>

      <form id="attendance-policy-form" className="me-policy-form" onSubmit={handleSubmit} noValidate>
        {feedback.message && (
          <p className={`me-policy-alert is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
            <span>{feedback.message}</span>
            {feedback.tone === 'error' && (
              <button type="button" className="me-policy-dismiss" aria-label="Dismiss error" onClick={() => setFeedback({ tone: '', message: '' })}>×</button>
            )}
          </p>
        )}
        {errors.form && <p className="me-policy-field-error" role="alert">{errors.form}</p>}

        <div className="me-policy-settings-grid">
          {showGeneral && <section className="me-policy-card" aria-labelledby="organization-settings-title">
            <div className="me-policy-card-heading">
              <span className="me-policy-card-icon"><Icon name="settings" /></span>
              <div>
                <h3 id="organization-settings-title">Organization Settings</h3>
                <p>Set the time standard used across attendance records.</p>
              </div>
            </div>
            <label className="me-policy-field" htmlFor="attendance-time-zone">
              <span>Organization time zone <span className="me-policy-required">*</span></span>
              <input
                id="attendance-time-zone"
                type="text"
                list="attendance-time-zone-options"
                autoComplete="off"
                placeholder="Search or choose a time zone"
                value={values.timeZone}
                aria-invalid={Boolean(errors.timeZone)}
                aria-describedby={errors.timeZone ? 'attendance-time-zone-error attendance-time-zone-help' : 'attendance-time-zone-help'}
                onChange={(event) => update('timeZone', event.target.value)}
                required
              />
              <datalist id="attendance-time-zone-options">
                {timeZones.map((zone) => <option key={zone} value={zone} />)}
              </datalist>
              {errors.timeZone && <span id="attendance-time-zone-error" className="me-policy-field-error">{errors.timeZone}</span>}
              <span id="attendance-time-zone-help" className="me-policy-help">Attendance dates and displayed timestamps follow this time zone. Suggested default: Asia/Kolkata.</span>
            </label>
            <div className="me-policy-general-fields">
              <label className="me-policy-field">
                <span>Default attendance mode</span>
                <select value={values.defaultAttendanceMode} onChange={(event) => update('defaultAttendanceMode', event.target.value)}>
                  <option value="FLEXIBLE">Flexible Attendance</option>
                  <option value="REMOTE_FIELD">Remote / Field Attendance</option>
                </select>
                <span className="me-policy-help">A default mode never creates a shift. Employee and team schedules take precedence.</span>
              </label>
              <label className="me-policy-field">
                <span>Default working-hours target (minutes)</span>
                <input type="number" min="0" max="1440" step="1" value={values.defaultWorkingMinutes} aria-invalid={Boolean(errors.defaultWorkingMinutes)} onChange={(event) => update('defaultWorkingMinutes', event.target.value)} />
                {errors.defaultWorkingMinutes && <span className="me-policy-field-error">{errors.defaultWorkingMinutes}</span>}
                <span className="me-policy-help">Stored as an organization reference only; it never triggers absence or late rules for Flexible Attendance.</span>
              </label>
              <label className="me-policy-field">
                <span>Default break deduction (minutes)</span>
                <input type="number" min="0" max="1440" step="1" value={values.defaultBreakMinutes} aria-invalid={Boolean(errors.defaultBreakMinutes)} onChange={(event) => update('defaultBreakMinutes', event.target.value)} />
                {errors.defaultBreakMinutes && <span className="me-policy-field-error">{errors.defaultBreakMinutes}</span>}
                <span className="me-policy-help">Used only when the applicable schedule does not specify a break.</span>
              </label>
              <div className="me-policy-field">
                <label className="me-policy-location-check">
                  <input type="checkbox" checked={values.locationRequired} onChange={(event) => update('locationRequired', event.target.checked)} />
                  Require location verification at Clock In
                </label>
                <span className="me-policy-help">Requires an applicable active geofence and employee consent.</span>
              </div>
              <div className="me-policy-field">
                <label className="me-policy-location-check">
                  <input type="checkbox" checked={values.allowRemoteAttendance} onChange={(event) => update('allowRemoteAttendance', event.target.checked)} />
                  Allow Remote / Work From Home attendance
                </label>
                <span className="me-policy-help">Enforced by the Clock In Cloud Function. Disabled locations are rejected before creating a punch.</span>
              </div>
              <label className="me-policy-field">
                <span>Correction request window (days)</span>
                <input type="number" min="1" max="365" step="1" value={values.correctionWindowDays} aria-invalid={Boolean(errors.correctionWindowDays)} onChange={(event) => update('correctionWindowDays', event.target.value)} />
                {errors.correctionWindowDays && <span className="me-policy-field-error">{errors.correctionWindowDays}</span>}
                <span className="me-policy-help">Requests outside this window or for future dates are rejected by the backend.</span>
              </label>
              <div className="me-policy-operational-flags me-policy-full-width">
                <label><input type="checkbox" checked disabled /> Clock In is required</label>
                <label><input type="checkbox" checked disabled /> Clock Out is required</label>
                <label><input type="checkbox" checked disabled /> Missing punch-outs require HR review</label>
              </div>
              <p className="me-policy-help me-policy-full-width">These controls are enforced by the existing authenticated attendance and approval workflow. Selfie verification and automatic record-retention cleanup are not currently supported, so they cannot be enabled here.</p>
            </div>
          </section>}

          {showCalendar && <section className="me-policy-card" aria-labelledby="weekly-off-title">
            <div className="me-policy-card-heading">
              <span className="me-policy-card-icon"><Icon name="calendar" /></span>
              <div>
                <h3 id="weekly-off-title">Weekly Off Days</h3>
                <p>Select any combination of regular organization rest days.</p>
              </div>
            </div>
            <fieldset className="me-policy-weekday-grid">
              <legend className="me-policy-sr-only">Select organization weekly off days</legend>
              {WEEKDAYS.map(([label, day]) => {
                const selected = values.weeklyOffs.includes(day)
                return (
                  <label className={`me-policy-day ${selected ? 'is-selected' : ''}`} key={day}>
                    <input type="checkbox" checked={selected} onChange={() => toggleWeekday(day)} />
                    <span className="me-policy-day-check"><Icon name="check" size={14} /></span>
                    <span>{label}</span>
                  </label>
                )
              })}
            </fieldset>
            <p className="me-policy-help">These are organization-level defaults. Employee or team schedules may override them where supported.</p>
          </section>}
        </div>

        {showCalendar && <section className="me-policy-card me-policy-holidays" aria-labelledby="holiday-calendar-title">
          <div className="me-policy-card-heading">
            <span className="me-policy-card-icon"><Icon name="calendar" /></span>
            <div>
              <h3 id="holiday-calendar-title">Holiday Calendar</h3>
              <p>Maintain holidays on the organization calendar for {values.timeZone}.</p>
            </div>
            <span className="me-policy-count">{values.holidays.length} / 100</span>
          </div>
          <div className="me-policy-holiday-entry">
            <label className="me-policy-field" htmlFor="attendance-holiday-date">
              <span>Date <span className="me-policy-required">*</span></span>
              <input
                id="attendance-holiday-date"
                type="date"
                value={draftDate}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? 'attendance-holiday-date-error' : undefined}
                onChange={(event) => updateDraft('date', event.target.value)}
              />
              {errors.date && <span id="attendance-holiday-date-error" className="me-policy-field-error">{errors.date}</span>}
            </label>
            <label className="me-policy-field" htmlFor="attendance-holiday-name">
              <span>Holiday name <span className="me-policy-required">*</span></span>
              <input
                id="attendance-holiday-name"
                type="text"
                maxLength={100}
                placeholder="e.g. Independence Day"
                value={draftName}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'attendance-holiday-name-error' : undefined}
                onChange={(event) => updateDraft('name', event.target.value)}
              />
              {errors.name && <span id="attendance-holiday-name-error" className="me-policy-field-error">{errors.name}</span>}
            </label>
            <div className="me-policy-entry-actions">
              <button className="me-policy-button is-primary" type="button" onClick={addHoliday}>
                <Icon name={editingDate ? 'check' : 'plus'} size={16} />
                {editingDate ? 'Update holiday' : 'Add holiday'}
              </button>
              {editingDate && <button className="me-policy-button is-secondary" type="button" onClick={clearHolidayDraft}>Cancel</button>}
            </div>
          </div>
          {values.holidays.length ? (
            <div className="me-policy-holiday-list" role="table" aria-label="Configured holidays">
              <div className="me-policy-holiday-row is-heading" role="row">
                <span role="columnheader">Date</span><span role="columnheader">Holiday name</span><span role="columnheader">Actions</span>
              </div>
              {values.holidays.map((holiday) => (
                <div className="me-policy-holiday-row" role="row" key={holiday.date}>
                  <span role="cell" className="me-policy-holiday-date">{formatHolidayDate(holiday.date)}</span>
                  <span role="cell" className="me-policy-holiday-name">{holiday.name}</span>
                  <span role="cell" className="me-policy-holiday-actions">
                    <button type="button" className="me-policy-icon-button" aria-label={`Edit ${holiday.name}`} onClick={() => editHoliday(holiday)}>
                      <Icon name="edit" size={16} /><span>Edit</span>
                    </button>
                    <button type="button" className="me-policy-icon-button is-danger" aria-label={`Delete ${holiday.name}`} onClick={() => deleteHoliday(holiday.date)}>
                      <Icon name="trash" size={16} /><span>Delete</span>
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="me-policy-empty">
              <span className="me-policy-empty-icon"><Icon name="calendar" size={20} /></span>
              <strong>No holidays configured</strong>
              <span>Add organization holidays above to include them in attendance rules.</span>
            </div>
          )}
        </section>}

        <aside className="me-policy-flex-notice" aria-label="Flexible attendance information">
          <span className="me-policy-notice-icon"><Icon name="info" size={19} /></span>
          <div>
            <strong>Flexible Attendance Enabled</strong>
            <p>Employees without an assigned shift can record their actual Clock In and Clock Out times. Fixed-shift late and early-leaving rules are not applied when no applicable shift exists.</p>
          </div>
        </aside>

        <div className="me-policy-footer">
          <span>{hasChanges ? 'Unsaved changes' : 'All changes saved'}</span>
          <div className="me-policy-footer-actions">
            <button className="me-policy-button is-secondary" type="button" onClick={resetChanges} disabled={busy || !hasChanges}>Reset changes</button>
            <button className="me-policy-button is-primary" type="submit" disabled={busy || !hasChanges}>
              {busy && <span className="me-policy-spinner" aria-hidden="true" />}
              {busy ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

export default function AttendancePolicySettings({ policy, section = 'all' }) {
  if (policy.status === 'loading') {
    return (
      <section className="dash-card me-card me-policy-settings me-policy-loading">
        <span className="me-policy-spinner" aria-hidden="true" />
        <p className="hrms-muted">Loading attendance policy settings…</p>
      </section>
    )
  }

  if (policy.status === 'error') {
    return (
      <section className="dash-card me-card me-policy-settings" aria-labelledby="attendance-policy-title">
        <h2 id="attendance-policy-title">Attendance Policy Settings</h2>
        <p className="me-policy-alert is-error" role="alert">Could not load attendance settings: {policy.error}</p>
      </section>
    )
  }

  return <AttendancePolicyForm policy={policy} section={section} />
}
