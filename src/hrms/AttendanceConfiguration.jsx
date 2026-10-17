import { useEffect, useMemo, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import {
  approveAttendanceRetentionPolicy,
  manageAttendanceConfiguration,
  pauseAttendanceRetentionCleanup,
  previewAttendanceRetention,
  saveAttendanceRetentionPolicy,
  setAttendanceRetentionHold,
} from '../me/api'
import AttendancePolicySettings from '../me/AttendancePolicySettings'
import AttendancePolicyCatalog from './AttendancePolicyCatalog'
import { AttendanceApprovalQueue } from '../me/AttendanceApprovals'
import { HR_ROLES, WEEKDAY_NAMES, workLocationLabel } from '../me/constants'
import {
  useAttendanceConfigurationCollection,
  useAttendanceConfigurationHistory,
  useAttendanceApprovalItems,
  useDirectory,
  useSettingsDoc,
  useUserProfile,
} from '../me/hooks'
import { formatDateKey, formatMinutes, toIstDateKey } from '../me/time'

const MODE_OPTIONS = [
  ['FLEXIBLE', 'Flexible Attendance'],
  ['FIXED_SHIFT', 'Fixed Shift'],
  ['ROTATIONAL_SHIFT', 'Rotational Shift'],
  ['REMOTE_FIELD', 'Remote / Field Attendance'],
]

const TABS = [
  ['general', 'General Attendance Settings'],
  ['shifts', 'Shift Management'],
  ['teams', 'Team Schedules'],
  ['employees', 'Employee Schedule Assignment'],
  ['calendar', 'Weekly Off & Holiday Settings'],
  ['automation', 'Attendance Automation Rules'],
  ['approvals', 'Punch Correction & Missing Punch-Out Approvals'],
  ['retention', 'Attendance Retention & Archive'],
  ['geofence', 'Location & Geofence Settings'],
  ['history', 'Configuration History'],
  ['records', 'Attendance Records'],
  ['templates', 'Attendance Templates'],
  ['rules', 'Holiday & Weekly Off Rules'],
  ['holidayPolicy', 'Holiday Policy'],
  ['leavePolicy', 'Leave Policy'],
  ['weeklyHoliday', 'Weekly Holiday Policies'],
  ['overview', 'Configuration Overview'],
]

const TODAY = toIstDateKey(new Date())
const FIRST_OF_MONTH = `${TODAY.slice(0, 7)}-01`

function defaultForm(person) {
  return {
    uid: person?.id ?? '',
    templateId: '',
    attendanceMode: 'FLEXIBLE',
    assignedShiftId: '',
    teamId: person?.teamId || person?.department || '',
    effectiveFrom: TODAY,
    effectiveUntil: '',
    weeklyOffDays: [],
    shiftIdsByWeekday: {},
    isActive: true,
  }
}

function defaultShift() {
  return {
    id: '',
    name: '',
    code: '',
    shiftStart: '',
    shiftEnd: '',
    graceMinutes: '0',
    breakMinutes: '0',
    weeklyOffDays: [],
    applicableTeams: '',
    applicableEmployees: '',
    shiftType: 'DAY',
    effectiveFrom: TODAY,
    effectiveUntil: '',
    isActive: true,
  }
}

function asCsv(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function useAttendanceReport(fromDate, toDate, enabled) {
  const [state, setState] = useState({ status: 'loading', items: [], error: '' })

  useEffect(() => {
    if (!enabled) return undefined
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate) || fromDate > toDate) {
      return undefined
    }
    return onSnapshot(
      query(
        collection(db, 'attendance'),
        where('date', '>=', fromDate),
        where('date', '<=', toDate),
      ),
      (snapshot) =>
        setState({
          status: 'ready',
          items: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
          error: '',
        }),
      (error) => setState({ status: 'error', items: [], error: error.message }),
    )
  }, [enabled, fromDate, toDate])

  return state
}

function WeekdayChecks({ value, onChange, label = 'Weekly off days' }) {
  function toggle(day) {
    onChange(value.includes(day) ? value.filter((item) => item !== day) : [...value, day].sort((a, b) => a - b))
  }

  return (
    <fieldset className="att-config-weekdays">
      <legend>{label}</legend>
      {WEEKDAY_NAMES.map((weekday, day) => (
        <label key={weekday}>
          <input type="checkbox" checked={value.includes(day)} onChange={() => toggle(day)} />
          {weekday}
        </label>
      ))}
    </fieldset>
  )
}

function ShiftMap({ shifts, value, onChange }) {
  return (
    <div className="att-config-shift-map">
      {WEEKDAY_NAMES.map((day, index) => (
        <label className="hrms-field" key={day}>
          {day} shift
          <select
            value={value[index] ?? ''}
            onChange={(event) => onChange({ ...value, [index]: event.target.value })}
          >
            <option value="">No shift</option>
            {shifts.filter((shift) => shift.isActive !== false).map((shift) => (
              <option key={shift.id} value={shift.id}>{shift.name} ({shift.code})</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}

function formatAttendanceTimestamp(value, timeZone) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timeZone || 'Asia/Kolkata',
    }).format(value)
  } catch {
    return value.toLocaleString()
  }
}

function AttendanceRecords({ employees, shifts, timeZone }) {
  const [fromDate, setFromDate] = useState(FIRST_OF_MONTH)
  const [toDate, setToDate] = useState(TODAY)
  const [queryText, setQueryText] = useState('')
  const [mode, setMode] = useState('')
  const [shiftId, setShiftId] = useState('')
  const [status, setStatus] = useState('')
  const [savingHold, setSavingHold] = useState('')
  const [holdFeedback, setHoldFeedback] = useState({ tone: '', message: '' })
  const invalidRange =
    !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(toDate) ||
    fromDate > toDate
  const records = useAttendanceReport(fromDate, toDate, true)
  const people = useMemo(() => new Map(employees.map((person) => [person.id, person])), [employees])
  const filtered = (invalidRange ? [] : records.items).filter((record) => {
    const person = people.get(record.uid)
    const name = `${person?.fullName ?? ''} ${person?.employeeId ?? ''} ${person?.department ?? ''}`.toLowerCase()
    const matchesStatus = !status || (
      status === 'INCOMPLETE'
        ? record.punchIn && !record.punchOut
        : status === 'late'
          ? record.isLate
          : record.status === status
    )
    return (!queryText || name.includes(queryText.toLowerCase())) &&
      (!mode || (record.attendanceMode ?? 'FLEXIBLE') === mode) &&
      (!shiftId || record.assignedShiftId === shiftId) &&
      matchesStatus
  }).sort((a, b) => b.date.localeCompare(a.date))

  async function toggleHold(record) {
    const hold = record.retentionHold !== true
    const reason = hold ? window.prompt('Enter a reason for the investigation hold (5–300 characters):') : ''
    if (hold && reason === null) return
    if (hold && reason.trim().length < 5) {
      setHoldFeedback({ tone: 'error', message: 'Enter a reason of at least 5 characters. The attendance record was not changed.' })
      return
    }
    setSavingHold(record.id)
    setHoldFeedback({ tone: '', message: '' })
    try {
      await setAttendanceRetentionHold({ attendanceId: record.id, hold, reason })
      setHoldFeedback({ tone: 'success', message: hold ? 'Investigation hold added.' : 'Investigation hold released.' })
    } catch (error) {
      setHoldFeedback({ tone: 'error', message: error.message || 'Could not update the investigation hold.' })
    } finally {
      setSavingHold('')
    }
  }

  return (
    <section className="dash-card me-card">
      <div className="att-config-filters">
        <label className="hrms-field">From<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label className="hrms-field">To<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        <label className="hrms-field">Employee / team<input type="search" value={queryText} onChange={(event) => setQueryText(event.target.value)} /></label>
        <label className="hrms-field">Attendance mode
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="">All modes</option>
            {MODE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="hrms-field">Shift
          <select value={shiftId} onChange={(event) => setShiftId(event.target.value)}>
            <option value="">All shifts</option>
            {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
          </select>
        </label>
        <label className="hrms-field">Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="leave">Leave</option>
            <option value="absent">Absent</option>
            <option value="INCOMPLETE">Incomplete session</option>
          </select>
        </label>
      </div>
      {invalidRange && <p className="me-feedback is-error" role="alert">Choose a valid date range.</p>}
      {!invalidRange && records.status === 'loading' && <p className="me-state">Loading attendance records…</p>}
      {!invalidRange && records.status === 'error' && <p className="me-feedback is-error" role="alert">{records.error}</p>}
      {holdFeedback.message && <p className={`me-feedback is-${holdFeedback.tone}`} role={holdFeedback.tone === 'error' ? 'alert' : 'status'}>{holdFeedback.message}</p>}
      <div className="hrms-table-wrap">
        <table className="hrms-table">
          <thead>
            <tr><th>Date</th><th>Employee</th><th>Department</th><th>Mode</th><th>Shift</th><th>Work location</th><th>Clock in</th><th>Clock out</th><th>Duration</th><th>Status</th><th>Investigation hold</th></tr>
          </thead>
          <tbody>
            {filtered.map((record) => {
              const person = people.get(record.uid)
              const attendanceMode = record.attendanceMode ?? 'FLEXIBLE'
              return (
                <tr key={record.id}>
                  <td>{formatDateKey(record.date)}</td>
                  <td>{person?.fullName || person?.employeeId || record.uid}</td>
                  <td>{person?.department || '—'}</td>
                  <td>{attendanceMode}</td>
                  <td>{record.shiftName || 'Shift Not Assigned'}</td>
                  <td>{workLocationLabel(record.workLocation)}</td>
                  <td>{formatAttendanceTimestamp(record.punchIn?.toDate?.(), timeZone)}</td>
                  <td>{formatAttendanceTimestamp(record.punchOut?.toDate?.(), timeZone)}</td>
                  <td>{record.workedMinutes == null ? '—' : formatMinutes(record.workedMinutes)}</td>
                  <td>{record.punchIn && !record.punchOut ? 'Incomplete' : record.isLate ? 'Late' : attendanceMode === 'FLEXIBLE' ? 'Present — Flexible' : record.status || 'Recorded'}</td>
                  <td>
                    <button type="button" className="hrms-btn-ghost" disabled={Boolean(savingHold)} onClick={() => toggleHold(record)}>
                      {savingHold === record.id ? 'Saving…' : record.retentionHold === true ? 'Release hold' : 'Place on hold'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {!invalidRange && records.status === 'ready' && filtered.length === 0 && <tr><td colSpan="11">No attendance records match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function auditValue(value) {
  if (value == null) return 'No previous configuration'
  return JSON.stringify(value, (_, item) => {
    if (item && typeof item.toDate === 'function') return item.toDate().toISOString()
    return item
  }, 2)
}

function AttendanceConfigurationHistory({ state, people }) {
  const entries = state.items.slice().sort((left, right) => {
    const leftTime = left.at?.toDate?.().getTime?.() ?? 0
    const rightTime = right.at?.toDate?.().getTime?.() ?? 0
    return rightTime - leftTime
  })
  return (
    <section className="dash-card me-card att-config-audit">
      <div className="att-policy-head">
        <div>
          <h2>Configuration History</h2>
          <p className="hrms-muted">Read-only audit trail for attendance settings, shifts, and schedules.</p>
        </div>
      </div>
      {state.status === 'loading' && <p className="hrms-muted">Loading configuration history…</p>}
      {state.status === 'error' && <p className="me-feedback is-error" role="alert">{state.error}</p>}
      {state.status === 'ready' && entries.length === 0 && (
        <div className="att-policy-empty"><strong>No changes recorded</strong><span>Attendance configuration updates will be listed here.</span></div>
      )}
      {state.status === 'ready' && entries.length > 0 && (
        <div className="hrms-table-wrap">
          <table className="hrms-table">
            <thead><tr><th>Changed</th><th>Configuration</th><th>Related to</th><th>Updated by</th><th>Effective from</th><th>Values</th></tr></thead>
            <tbody>
              {entries.map((entry) => {
                const related = entry.related ?? {}
                const person = people.find((candidate) => candidate.id === related.employeeUid)
                const at = entry.at?.toDate?.()
                return (
                  <tr key={entry.id}>
                    <td>{at ? at.toLocaleString() : '—'}</td>
                    <td>{entry.action} · {entry.kind || 'attendance'}</td>
                    <td>{person?.fullName || related.employeeUid || related.teamId || related.shiftId || entry.documentId || 'Organization'}</td>
                    <td>{people.find((candidate) => candidate.id === entry.actorUid)?.fullName || entry.actorUid || '—'}</td>
                    <td>{entry.effectiveDate || '—'}</td>
                    <td>
                      {entry.previousValue === undefined && entry.newValue === undefined
                        ? <span className="hrms-muted">Legacy event — values were not captured</span>
                        : <details>
                            <summary>View before / after</summary>
                            <div className="att-config-audit-values">
                              <div><strong>Previous</strong><pre>{auditValue(entry.previousValue)}</pre></div>
                              <div><strong>New</strong><pre>{auditValue(entry.newValue)}</pre></div>
                            </div>
                          </details>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function AttendanceRetentionSettings({ policy }) {
  const [retentionDraft, setRetentionDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const [runs, setRuns] = useState({ status: 'loading', items: [], error: '' })
  const savedDays = policy.data?.retentionDays ?? 0
  const policyReady = policy.status === 'ready' || policy.status === 'missing'
  const retentionDays = retentionDraft?.base === savedDays ? retentionDraft.value : String(savedDays)

  useEffect(() => onSnapshot(
    query(collection(db, 'attendanceRetentionRuns'), orderBy('startedAt', 'desc'), limit(10)),
    (snapshot) => {
      const now = Date.now()
      setRuns({
        status: 'ready',
        items: snapshot.docs.map((item) => {
          const run = { id: item.id, ...item.data() }
          return {
            ...run,
            recentPreview: run.type === 'dry-run' && run.startedAt?.toMillis &&
              now - run.startedAt.toMillis() <= 24 * 60 * 60 * 1000,
          }
        }),
        error: '',
      })
    },
    (error) => setRuns({ status: 'error', items: [], error: error.message }),
  ), [])

  const latestPreview = runs.items.find((run) =>
    run.type === 'dry-run' &&
    run.status === 'COMPLETED' &&
    run.truncated === false &&
    run.recentPreview &&
    run.retentionDays === Number(retentionDays))
  const isApproved = policy.data?.retentionCleanupApproved === true
  const changed = Number(retentionDays) !== savedDays
  const validRetentionInput = retentionDays === '0' ||
    (/^\d+$/.test(retentionDays) && Number(retentionDays) >= 365 && Number(retentionDays) <= 3650)
  const previewReady = Boolean(latestPreview)

  async function runAction(action) {
    setBusy(true)
    setFeedback({ tone: '', message: '' })
    try {
      const result = await action()
      if (result?.runId) {
        setFeedback({
          tone: result.status === 'COMPLETED' ? 'success' : 'error',
          message: result.status === 'COMPLETED'
            ? `Dry run complete: ${result.eligibleCount} eligible out of ${result.scannedCount} scanned before ${result.cutoffDate}. Excluded: ${result.excludedCounts['active-session']} active sessions, ${result.excludedCounts['pending-approval']} pending approvals, ${result.excludedCounts['investigation-hold']} investigation holds.`
            : `Dry run ${result.status.toLowerCase()}. Raise the retention period to reduce the candidate set, then run a complete preview before approval.`,
        })
      } else if (result?.approved) {
        setFeedback({ tone: 'success', message: 'Cleanup approved. The scheduled job will archive and verify records before deletion.' })
      } else if (result?.paused) {
        setFeedback({ tone: 'success', message: 'Scheduled cleanup paused. Existing archives are retained and no new records will be processed.' })
      } else {
        setFeedback({ tone: 'success', message: 'Retention period saved. Cleanup remains disabled until you run a dry run and approve it.' })
      }
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message || 'The retention request failed.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="me-stack att-retention">
      <section className="dash-card me-card">
        <h3>Attendance Retention &amp; Archive</h3>
        <p className="hrms-muted">Expired attendance is archived with its approval and audit history. Originals are removed only after archive verification and a final source check.</p>
        {policy.status === 'loading' && <p className="hrms-muted">Loading saved retention policy…</p>}
        {policy.status === 'error' && <p className="me-feedback is-error" role="alert">Could not load the saved attendance policy: {policy.error}</p>}
        <div className="att-retention-status">
          <strong>{isApproved ? 'Scheduled cleanup approved' : 'Cleanup disabled'}</strong>
          <span>{isApproved ? `${savedDays} day retention period` : 'Saving a period does not enable deletion.'}</span>
        </div>
        <label className="hrms-field att-retention-period">
          Retain attendance for (days)
          <input
            type="number"
            min="0"
            max="3650"
            step="1"
            value={retentionDays}
            onChange={(event) => setRetentionDraft({ base: savedDays, value: event.target.value })}
            aria-describedby="retention-period-help"
          />
        </label>
        <p className="hrms-muted" id="retention-period-help">Choose 365–3650 days. Enter 0 to disable cleanup. Active sessions, pending approval requests, and records on investigation hold are always excluded.</p>
        {!validRetentionInput && <p className="me-feedback is-error" role="alert">Enter 0 to disable cleanup or a whole number from 365 to 3650 days.</p>}
        <div className="att-config-actions">
          <button
            type="button"
            className="hrms-btn"
            disabled={busy || !policyReady || !changed || !validRetentionInput}
            onClick={() => runAction(() => saveAttendanceRetentionPolicy({ retentionDays: Number(retentionDays) }))}
          >{busy ? 'Working…' : 'Save retention period'}</button>
          <button
            type="button"
            className="hrms-btn-ghost"
            disabled={busy || !policyReady || savedDays < 365}
            onClick={() => runAction(previewAttendanceRetention)}
          >Run dry-run preview</button>
          <button
            type="button"
            className="hrms-btn-ghost"
            disabled={busy || !policyReady || !previewReady || isApproved}
            onClick={() => {
              if (window.confirm('Approve the retention policy and enable the scheduled archive-first cleanup? This allows the scheduled job to delete originals only after successful archive verification.')) {
                runAction(approveAttendanceRetentionPolicy)
              }
            }}
          >Approve scheduled cleanup</button>
          {isApproved && <button
            type="button"
            className="hrms-btn-ghost"
            disabled={busy || !policyReady}
            onClick={() => {
              if (window.confirm('Pause scheduled attendance cleanup? No new attendance records will be processed.')) {
                runAction(pauseAttendanceRetentionCleanup)
              }
            }}
          >Pause scheduled cleanup</button>}
        </div>
        {feedback.message && <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
        {!previewReady && savedDays > 0 && <p className="hrms-muted">A complete dry run for the saved retention period, completed within 24 hours, is required before approval.</p>}
      </section>
      <section className="dash-card me-card">
        <h3>Retention run history</h3>
        {runs.status === 'error' && <p className="me-feedback is-error" role="alert">{runs.error}</p>}
        {runs.status === 'loading' && <p className="hrms-muted">Loading retention activity…</p>}
        {runs.status === 'ready' && runs.items.length === 0 && <p className="hrms-muted">No dry runs or scheduled cleanup executions yet.</p>}
        {runs.items.length > 0 && <div className="hrms-table-wrap"><table className="hrms-table">
          <thead><tr><th>Run</th><th>Status</th><th>Retention</th><th>Scanned</th><th>Eligible</th><th>Archived</th><th>Deleted</th><th>Failures</th><th>Duration</th></tr></thead>
          <tbody>{runs.items.map((run) => <tr key={run.id}>
            <td>{run.type === 'dry-run' ? 'Dry run' : 'Scheduled cleanup'}</td>
            <td>{run.status}{run.truncated ? ' · incomplete' : ''}</td>
            <td>{run.retentionDays ? `${run.retentionDays} days` : '—'}</td>
            <td>{run.scannedCount ?? '—'}</td>
            <td>{run.eligibleCount ?? '—'}</td>
            <td>{run.archivedCount ?? '—'}</td>
            <td>{run.deletedCount ?? '—'}</td>
            <td>{run.failureCount ?? 0}</td>
            <td>{Number.isFinite(run.durationMs) ? `${run.durationMs} ms` : '—'}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>
    </div>
  )
}

export default function AttendanceConfiguration({ user }) {
  const profile = useUserProfile(user.uid)
  const isHr = Boolean(profile.profile && HR_ROLES.includes(profile.profile.role))
  const employees = useDirectory(isHr)
  const shiftsState = useAttendanceConfigurationCollection(isHr, 'attendanceShifts')
  const settingsState = useAttendanceConfigurationCollection(isHr, 'employeeAttendanceSettings')
  const teamSchedulesState = useAttendanceConfigurationCollection(isHr, 'teamAttendanceSchedules')
  const templatesState = useAttendanceConfigurationCollection(isHr, 'attendanceTemplates')
  const rulesState = useAttendanceConfigurationCollection(isHr, 'attendanceRules')
  const holidayPoliciesState = useAttendanceConfigurationCollection(isHr, 'attendanceHolidayPolicies')
  const leavePoliciesState = useAttendanceConfigurationCollection(isHr, 'attendanceLeavePolicies')
  const weeklyHolidaysState = useAttendanceConfigurationCollection(isHr, 'attendanceWeeklyHolidays')
  const geofencesState = useAttendanceConfigurationCollection(isHr, 'attendanceGeofences')
  const automationsState = useAttendanceConfigurationCollection(isHr, 'attendanceAutomationRules')
  const auditState = useAttendanceConfigurationHistory(isHr)
  const policy = useSettingsDoc('attendance')
  const approvalItems = useAttendanceApprovalItems(user.uid, isHr)
  const [tab, setTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [selectedUid, setSelectedUid] = useState('')
  const [showHistoryUid, setShowHistoryUid] = useState('')
  const [assignmentShiftId, setAssignmentShiftId] = useState('')
  const [employeeForm, setEmployeeForm] = useState(defaultForm(null))
  const [shiftForm, setShiftForm] = useState(defaultShift())
  const [teamForm, setTeamForm] = useState({
    scheduleName: '',
    teamId: '',
    attendanceMode: 'FLEXIBLE',
    assignedShiftId: '',
    effectiveFrom: TODAY,
    effectiveUntil: '',
    weeklyOffDays: [],
    shiftIdsByWeekday: {},
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })

  const shifts = shiftsState.items
  const settings = settingsState.items
  const teamSchedules = teamSchedulesState.items
  const staff = employees.items
  const normalizedSearch = search.trim().toLowerCase()
  const shownStaff = staff.filter((person) =>
    [person.fullName, person.employeeId, person.department, person.designation, person.email]
      .some((value) => value?.toLowerCase().includes(normalizedSearch)),
  ).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))

  async function save(action, values) {
    setSaving(true)
    setFeedback({ tone: '', message: '' })
    try {
      await manageAttendanceConfiguration({ action, ...values })
      setFeedback({ tone: 'success', message: 'Attendance configuration saved.' })
      return true
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message || 'Could not save attendance configuration.' })
      return false
    } finally {
      setSaving(false)
    }
  }

  async function submitEmployee(event) {
    event.preventDefault()
    const done = await save('assign-employee', {
      ...employeeForm,
      assignedShiftId: employeeForm.assignedShiftId || null,
      effectiveUntil: employeeForm.effectiveUntil || null,
    })
    if (done) setSelectedUid('')
  }

  async function submitShift(event) {
    event.preventDefault()
    const values = {
      ...shiftForm,
      graceMinutes: Number(shiftForm.graceMinutes),
      breakMinutes: Number(shiftForm.breakMinutes),
      applicableTeams: asCsv(shiftForm.applicableTeams),
      applicableEmployees: asCsv(shiftForm.applicableEmployees),
      effectiveUntil: shiftForm.effectiveUntil || null,
    }
    if (await save('save-shift', values)) setShiftForm(defaultShift())
  }

  async function submitTeam(event) {
    event.preventDefault()
    const done = await save('save-team-schedule', {
      ...teamForm,
      assignedShiftId: teamForm.assignedShiftId || null,
      effectiveUntil: teamForm.effectiveUntil || null,
      scheduleName: teamForm.scheduleName.trim(),
    })
    if (done) {
      setTeamForm({
        scheduleName: '',
        teamId: '',
        attendanceMode: 'FLEXIBLE',
        assignedShiftId: '',
        effectiveFrom: TODAY,
        effectiveUntil: '',
        weeklyOffDays: [],
        shiftIdsByWeekday: {},
        isActive: true,
      })
    }
  }

  if (profile.status === 'loading') return <section className="me-page"><p className="me-state">Loading permissions…</p></section>
  if (!isHr) return <section className="me-page"><p className="me-feedback is-error" role="alert">Attendance Configuration is restricted to HR and SUPER_ADMIN users.</p></section>

  return (
    <section className="me-page att-config-page">
      <header className="me-page-head">
        <div>
          <h2>Attendance Configuration</h2>
          <p className="hrms-muted">Manage shifts and schedules. Employees without an applicable schedule use flexible attendance.</p>
        </div>
      </header>
      <nav className="att-config-tabs" aria-label="Attendance configuration">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {feedback.message && <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}

      {tab === 'general' && <AttendancePolicySettings policy={policy} section="general" />}
      {tab === 'history' && <AttendanceConfigurationHistory state={auditState} people={staff} />}

      {tab === 'overview' && (
        <div className="att-policy-setting-rows">
          {[
            ['general', 'General Attendance Settings', policy.status === 'ready' ? 'Configured' : 'Setup required', 'Organization defaults, time zone, break policy, and location requirements.'],
            ['templates', 'Attendance Templates', `${templatesState.items.length} configured`, 'Reusable attendance modes, tracking defaults, and linked policies.'],
            ['rules', 'Attendance Rules for Holiday & Weekly Off', `${rulesState.items.length} configured`, 'Attendance and approval expectations for non-working days.'],
            ['shifts', 'Shift Settings', `${shifts.length} shift${shifts.length === 1 ? '' : 's'} added`, 'Manage shift times, breaks, effective dates, and assignments.'],
            ['automation', 'Automation Rules', `${automationsState.items.length} configured`, 'Set review safeguards for eligible scheduled processing.'],
            ['holidayPolicy', 'Holiday Policy', `${holidayPoliciesState.items.length} configured`, 'Maintain structured, year-based holiday calendars.'],
            ['leavePolicy', 'Leave Policy', `${leavePoliciesState.items.length} configured`, 'Manage leave rules without rewriting historical balances.'],
            ['weeklyHoliday', 'Weekly Holidays', `${weeklyHolidaysState.items.length} configured`, 'Set effective-dated weekly off patterns for groups.'],
            ['geofence', 'Attendance Geofence Settings', `${geofencesState.items.length} configured`, 'Manage branch location boundaries for attendance workflows.'],
            ['approvals', 'Attendance Approvals', `${approvalItems.items.length} pending`, 'Review punch corrections and incomplete attendance sessions.'],
            ['retention', 'Attendance Retention & Archive', policy.data?.retentionCleanupApproved ? 'Scheduled cleanup approved' : 'Cleanup disabled', 'Preview, approve, and monitor archive-first attendance retention.'],
            ['history', 'Configuration History', `${auditState.items.length} recent changes`, 'Read-only audit log of attendance configuration changes.'],
            ['employees', 'Employee Attendance Settings', `${settings.length} configured`, 'Employee schedules take precedence over team schedules.'],
            ['teams', 'Team Schedules', `${teamSchedules.length} configured`, 'Set team defaults that apply when no employee schedule is active.'],
          ].map(([id, title, count, description]) => (
            <button className="att-policy-setting-row" type="button" key={id} onClick={() => setTab(id)}>
              <span className="att-policy-setting-icon" aria-hidden="true">⌘</span>
              <span className="att-policy-setting-copy"><strong>{title}</strong><small>{description}</small></span>
              <span className="att-policy-setting-count">{count}</span>
              <span className="att-policy-setting-chevron" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}

      {['templates', 'rules', 'automation', 'holidayPolicy', 'leavePolicy', 'weeklyHoliday', 'geofence'].includes(tab) && (
        <AttendancePolicyCatalog
          key={tab}
          kind={tab === 'templates' ? 'template' : tab === 'rules' ? 'rules' : tab === 'automation' ? 'automation' : tab === 'holidayPolicy' ? 'holidayPolicy' : tab === 'leavePolicy' ? 'leavePolicy' : tab === 'weeklyHoliday' ? 'weeklyHoliday' : 'geofence'}
          shifts={shifts}
          assignments={settings}
          holidayPolicies={holidayPoliciesState.items}
          weeklyHolidayPolicies={weeklyHolidaysState.items}
          people={staff}
          onBack={() => setTab('overview')}
        />
      )}
      {tab === 'approvals' && <AttendanceApprovalQueue state={approvalItems} people={staff} />}

      {tab === 'employees' && (
        <div className="me-stack">
          <section className="dash-card me-card">
            <label className="team-search">Search employee or team
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            {assignmentShiftId && <p className="hrms-muted">Select an employee below to assign {shifts.find((item) => item.id === assignmentShiftId)?.name || 'the selected shift'}.</p>}
            {employees.status === 'error' && <p className="me-feedback is-error" role="alert">{employees.error}</p>}
            <div className="hrms-table-wrap">
              <table className="hrms-table">
                <thead><tr><th>Employee ID</th><th>Employee</th><th>Department / Team</th><th>Mode</th><th>Assigned schedule / shift</th><th>Shift time</th><th>Weekly off</th><th>Effective dates</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {shownStaff.map((person) => {
                    const configs = settings.filter((item) => item.uid === person.id).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
                    const config = configs.find((item) => item.isActive !== false && item.effectiveFrom <= TODAY && (!item.effectiveUntil || item.effectiveUntil >= TODAY))
                    const teamId = config?.teamId || person.teamId || person.department
                    const teamConfig = teamSchedules.find((item) => item.teamId === teamId && item.isActive !== false && item.effectiveFrom <= TODAY && (!item.effectiveUntil || item.effectiveUntil >= TODAY))
                    const applicableConfig = config || teamConfig
                    const dayOfWeek = new Date(`${TODAY}T00:00:00Z`).getUTCDay()
                    const assignedShiftId = applicableConfig?.shiftIdsByWeekday?.[String(dayOfWeek)] || applicableConfig?.assignedShiftId
                    const shift = shifts.find((item) => item.id === assignedShiftId)
                    const assignedSchedule = applicableConfig?.name || (config ? 'Employee schedule' : teamConfig ? 'Team schedule' : 'Flexible default')
                    const attendanceModeLabel = MODE_OPTIONS.find(([value]) => value === applicableConfig?.attendanceMode)?.[1] ||
                      (policy.data?.defaultAttendanceMode === 'REMOTE_FIELD' ? 'Remote / Field Attendance' : 'Flexible Attendance')
                    return (
                      <tr key={person.id}>
                        <td>{person.employeeId || '—'}</td><td>{person.fullName || person.email}</td>
                        <td>{teamId || '—'}</td>
                        <td>{attendanceModeLabel}</td>
                        <td>{assignedSchedule} · {shift?.name || 'Shift Not Assigned'}</td>
                        <td>{shift ? `${shift.shiftStart}–${shift.shiftEnd}` : '—'}</td>
                        <td>{(applicableConfig?.weeklyOffDays || shift?.weeklyOffDays || policy.data?.weeklyOffs || []).map((day) => WEEKDAY_NAMES[day]).join(', ') || 'None'}</td>
                        <td>{applicableConfig ? `${applicableConfig.effectiveFrom || '—'} – ${applicableConfig.effectiveUntil || 'ongoing'}` : '—'}</td>
                        <td>{config ? 'Employee override' : teamConfig ? 'Team schedule' : 'Flexible default'}</td>
                        <td className="att-config-actions">
                          <button type="button" className="hrms-btn-ghost" onClick={() => {
                            const base = config ? { ...defaultForm(person), ...config, isActive: config.isActive !== false } : defaultForm(person)
                            setEmployeeForm({
                              ...base,
                              ...(assignmentShiftId ? { attendanceMode: 'FIXED_SHIFT', assignedShiftId: assignmentShiftId } : {}),
                            })
                            setSelectedUid(person.id)
                            setAssignmentShiftId('')
                          }}>{assignmentShiftId ? 'Assign selected shift' : 'Configure / Edit'}</button>
                          {config && config.isActive !== false && <button type="button" className="hrms-btn-ghost" disabled={saving} onClick={() => {
                            if (window.confirm(`Remove the active employee schedule for ${person.fullName || person.employeeId || 'this employee'}? Team or flexible defaults will apply next.`)) {
                              save('assign-employee', { ...config, isActive: false })
                            }
                          }}>Remove schedule</button>}
                          <button type="button" className="hrms-btn-ghost" onClick={() => setShowHistoryUid(showHistoryUid === person.id ? '' : person.id)}>History</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {showHistoryUid && (
              <div className="att-config-history">
                <strong>Configuration history: {staff.find((item) => item.id === showHistoryUid)?.fullName || showHistoryUid}</strong>
                {settings.filter((item) => item.uid === showHistoryUid).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map((item) => (
                  <p key={item.id}>{item.effectiveFrom} – {item.effectiveUntil || 'ongoing'} · {item.attendanceMode} · {shifts.find((shift) => shift.id === item.assignedShiftId)?.name || 'Shift Not Assigned'} · {item.isActive === false ? 'Inactive' : 'Active'}</p>
                ))}
              </div>
            )}
          </section>
          {selectedUid && (
            <form className="dash-card me-card att-config-form" onSubmit={submitEmployee}>
              <h3>Configure {staff.find((person) => person.id === selectedUid)?.fullName || 'employee'}</h3>
              <label className="hrms-field">Attendance mode
                <select value={employeeForm.attendanceMode} onChange={(event) => setEmployeeForm({ ...employeeForm, attendanceMode: event.target.value })}>
                  {MODE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="hrms-field">Attendance template
                <select
                  value={employeeForm.templateId || ''}
                  onChange={(event) => {
                    const templateId = event.target.value
                    const template = templatesState.items.find((item) => item.id === templateId)
                    setEmployeeForm({
                      ...employeeForm,
                      templateId,
                      ...(template ? {
                        attendanceMode: template.attendanceMode || employeeForm.attendanceMode,
                        assignedShiftId: template.assignedShiftId || '',
                        weeklyOffDays: template.weeklyOffDays || [],
                      } : {}),
                    })
                  }}
                >
                  <option value="">Use schedule settings</option>
                  {templatesState.items.filter((item) => item.isActive !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="hrms-field">Team / department
                <input value={employeeForm.teamId} onChange={(event) => setEmployeeForm({ ...employeeForm, teamId: event.target.value })} />
              </label>
              <label className="hrms-field">Assigned shift
                <select value={employeeForm.assignedShiftId || ''} onChange={(event) => setEmployeeForm({ ...employeeForm, assignedShiftId: event.target.value })}>
                  <option value="">No shift assigned</option>
                  {shifts.filter((shift) => shift.isActive !== false).map((shift) => <option value={shift.id} key={shift.id}>{shift.name} ({shift.code})</option>)}
                </select>
              </label>
              {employeeForm.attendanceMode === 'ROTATIONAL_SHIFT' && <ShiftMap shifts={shifts} value={employeeForm.shiftIdsByWeekday || {}} onChange={(shiftIdsByWeekday) => setEmployeeForm({ ...employeeForm, shiftIdsByWeekday })} />}
              <div className="att-config-date-fields">
                <label className="hrms-field">Effective from<input type="date" required value={employeeForm.effectiveFrom} onChange={(event) => setEmployeeForm({ ...employeeForm, effectiveFrom: event.target.value })} /></label>
                <label className="hrms-field">Effective until<input type="date" value={employeeForm.effectiveUntil || ''} onChange={(event) => setEmployeeForm({ ...employeeForm, effectiveUntil: event.target.value })} /></label>
              </div>
              <WeekdayChecks value={employeeForm.weeklyOffDays || []} onChange={(weeklyOffDays) => setEmployeeForm({ ...employeeForm, weeklyOffDays })} />
              <label className="att-config-check"><input type="checkbox" checked={employeeForm.isActive !== false} onChange={(event) => setEmployeeForm({ ...employeeForm, isActive: event.target.checked })} />Active configuration</label>
              <div className="att-config-actions">
                <button className="hrms-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save employee settings'}</button>
                <button className="hrms-btn-ghost" type="button" onClick={() => setSelectedUid('')}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === 'shifts' && (
        <div className="me-stack">
          <form className="dash-card me-card att-config-form" onSubmit={submitShift}>
            <h3>{shiftForm.id ? 'Edit shift' : 'Create shift'}</h3>
            <div className="att-config-date-fields">
              <label className="hrms-field">Shift name<input required value={shiftForm.name} onChange={(event) => setShiftForm({ ...shiftForm, name: event.target.value })} /></label>
              <label className="hrms-field">Shift code<input required value={shiftForm.code} onChange={(event) => setShiftForm({ ...shiftForm, code: event.target.value })} /></label>
              <label className="hrms-field">Shift type<select value={shiftForm.shiftType} onChange={(event) => setShiftForm({ ...shiftForm, shiftType: event.target.value })}><option value="DAY">Day</option><option value="NIGHT">Night</option><option value="ROTATIONAL">Rotational</option><option value="FLEXIBLE">Flexible</option></select></label>
              <label className="hrms-field">Start time<input type="time" required value={shiftForm.shiftStart} onChange={(event) => setShiftForm({ ...shiftForm, shiftStart: event.target.value })} /></label>
              <label className="hrms-field">End time<input type="time" required value={shiftForm.shiftEnd} onChange={(event) => setShiftForm({ ...shiftForm, shiftEnd: event.target.value })} /></label>
              <label className="hrms-field">Grace minutes<input type="number" min="0" max="1440" required value={shiftForm.graceMinutes} onChange={(event) => setShiftForm({ ...shiftForm, graceMinutes: event.target.value })} /></label>
              <label className="hrms-field">Break minutes<input type="number" min="0" max="1440" required value={shiftForm.breakMinutes} onChange={(event) => setShiftForm({ ...shiftForm, breakMinutes: event.target.value })} /></label>
              <label className="hrms-field">Applicable teams (comma-separated)<input value={shiftForm.applicableTeams} onChange={(event) => setShiftForm({ ...shiftForm, applicableTeams: event.target.value })} /></label>
              <label className="hrms-field">Applicable employees (UIDs, comma-separated)<input value={shiftForm.applicableEmployees} onChange={(event) => setShiftForm({ ...shiftForm, applicableEmployees: event.target.value })} /></label>
              <label className="hrms-field">Effective from<input type="date" required value={shiftForm.effectiveFrom} onChange={(event) => setShiftForm({ ...shiftForm, effectiveFrom: event.target.value })} /></label>
              <label className="hrms-field">Effective until<input type="date" value={shiftForm.effectiveUntil} onChange={(event) => setShiftForm({ ...shiftForm, effectiveUntil: event.target.value })} /></label>
            </div>
            <WeekdayChecks value={shiftForm.weeklyOffDays} onChange={(weeklyOffDays) => setShiftForm({ ...shiftForm, weeklyOffDays })} />
            <label className="att-config-check"><input type="checkbox" checked={shiftForm.isActive} onChange={(event) => setShiftForm({ ...shiftForm, isActive: event.target.checked })} />Active</label>
            <div className="att-config-actions">
              <button className="hrms-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save shift'}</button>
              <button className="hrms-btn-ghost" type="button" onClick={() => setShiftForm(defaultShift())}>Clear</button>
            </div>
          </form>
          <section className="dash-card me-card">
            <h3>Shifts</h3>
            {shiftsState.status === 'error' && <p className="me-feedback is-error" role="alert">{shiftsState.error}</p>}
            <div className="hrms-table-wrap"><table className="hrms-table">
              <thead><tr><th>Name / code</th><th>Time</th><th>Grace</th><th>Break</th><th>Applicable teams</th><th>Assigned employees</th><th>Weekly off</th><th>Effective dates</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{shifts.map((shift) => <tr key={shift.id}>
                <td>{shift.name} ({shift.code})</td><td>{shift.shiftStart}–{shift.shiftEnd}{shift.shiftEnd < shift.shiftStart ? ' · overnight' : ''}</td>
                <td>{shift.graceMinutes} min</td><td>{shift.breakMinutes} min</td>
                <td>{(shift.applicableTeams || []).join(', ') || '—'}</td>
                <td>{new Set([
                  ...settings.filter((item) => item.isActive !== false && item.assignedShiftId === shift.id).map((item) => item.uid),
                  ...settings.filter((item) => item.isActive !== false && templatesState.items.find((template) => template.id === item.templateId)?.assignedShiftId === shift.id).map((item) => item.uid),
                  ...teamSchedules.filter((item) => item.isActive !== false && item.assignedShiftId === shift.id).flatMap((item) => staff.filter((person) => (person.teamId || person.department) === item.teamId).map((person) => person.id)),
                ]).size}</td>
                <td>{(shift.weeklyOffDays || []).map((day) => WEEKDAY_NAMES[day]).join(', ') || 'None'}</td>
                <td>{shift.effectiveFrom} – {shift.effectiveUntil || 'ongoing'}</td><td>{shift.isActive === false ? 'Inactive' : 'Active'}</td>
                <td className="att-config-actions">
                  <button type="button" className="hrms-btn-ghost" onClick={() => setShiftForm({ ...defaultShift(), ...shift, graceMinutes: String(shift.graceMinutes), breakMinutes: String(shift.breakMinutes), applicableTeams: (shift.applicableTeams || []).join(', '), applicableEmployees: (shift.applicableEmployees || []).join(', ') })}>Edit</button>
                  <button type="button" className="hrms-btn-ghost" onClick={() => setShiftForm({
                    ...defaultShift(),
                    ...shift,
                    id: '',
                    name: `${shift.name} copy`,
                    code: `${shift.code}-COPY`.slice(0, 20),
                    graceMinutes: String(shift.graceMinutes),
                    breakMinutes: String(shift.breakMinutes),
                    applicableTeams: (shift.applicableTeams || []).join(', '),
                    applicableEmployees: (shift.applicableEmployees || []).join(', '),
                  })}>Duplicate</button>
                  <button type="button" className="hrms-btn-ghost" disabled={shift.isActive === false} onClick={() => {
                    setAssignmentShiftId(shift.id)
                    setTab('employees')
                  }}>Assign</button>
                  <button type="button" className="hrms-btn-ghost" disabled={shift.isActive === false || saving} onClick={() => save('save-shift', { ...shift, isActive: false })}>Deactivate</button>
                  <details className="att-config-shift-history">
                    <summary>View / assignments</summary>
                    <div>
                      <strong>Employee schedule history</strong>
                      {settings.filter((item) => item.assignedShiftId === shift.id || Object.values(item.shiftIdsByWeekday || {}).includes(shift.id)).map((item) => (
                        <p key={item.id}>{staff.find((person) => person.id === item.uid)?.fullName || item.uid} · {item.effectiveFrom} – {item.effectiveUntil || 'ongoing'} · {item.isActive === false ? 'Inactive' : 'Active'}</p>
                      ))}
                      <strong>Team schedule history</strong>
                      {teamSchedules.filter((item) => item.assignedShiftId === shift.id || Object.values(item.shiftIdsByWeekday || {}).includes(shift.id)).map((item) => (
                        <p key={item.id}>{item.name || item.teamId} · {item.effectiveFrom} – {item.effectiveUntil || 'ongoing'} · {item.isActive === false ? 'Inactive' : 'Active'}</p>
                      ))}
                    </div>
                  </details>
                </td>
              </tr>)}</tbody>
            </table></div>
          </section>
        </div>
      )}

      {tab === 'teams' && (
        <div className="me-stack">
          <form className="dash-card me-card att-config-form" onSubmit={submitTeam}>
            <h3>Team / department schedule</h3>
            <p className="hrms-muted">Employee-level schedules override team schedules. Overlapping active schedules are rejected at punch time.</p>
            <div className="att-config-date-fields">
              <label className="hrms-field">Schedule name<input required value={teamForm.scheduleName} onChange={(event) => setTeamForm({ ...teamForm, scheduleName: event.target.value })} /></label>
              <label className="hrms-field">Team / department<input required value={teamForm.teamId} onChange={(event) => setTeamForm({ ...teamForm, teamId: event.target.value })} /></label>
              <label className="hrms-field">Attendance mode<select value={teamForm.attendanceMode} onChange={(event) => setTeamForm({ ...teamForm, attendanceMode: event.target.value })}>{MODE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="hrms-field">Assigned shift<select value={teamForm.assignedShiftId} onChange={(event) => setTeamForm({ ...teamForm, assignedShiftId: event.target.value })}><option value="">No shift</option>{shifts.filter((shift) => shift.isActive !== false).map((shift) => <option key={shift.id} value={shift.id}>{shift.name} ({shift.code})</option>)}</select></label>
              <label className="hrms-field">Effective from<input type="date" required value={teamForm.effectiveFrom} onChange={(event) => setTeamForm({ ...teamForm, effectiveFrom: event.target.value })} /></label>
              <label className="hrms-field">Effective until<input type="date" value={teamForm.effectiveUntil} onChange={(event) => setTeamForm({ ...teamForm, effectiveUntil: event.target.value })} /></label>
            </div>
            {teamForm.attendanceMode === 'ROTATIONAL_SHIFT' && <ShiftMap shifts={shifts} value={teamForm.shiftIdsByWeekday} onChange={(shiftIdsByWeekday) => setTeamForm({ ...teamForm, shiftIdsByWeekday })} />}
            <WeekdayChecks value={teamForm.weeklyOffDays} onChange={(weeklyOffDays) => setTeamForm({ ...teamForm, weeklyOffDays })} />
            <button className="hrms-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save team schedule'}</button>
          </form>
          <section className="dash-card me-card">
            <h3>Team schedules</h3>
            <div className="hrms-table-wrap"><table className="hrms-table">
              <thead><tr><th>Schedule</th><th>Team</th><th>Mode</th><th>Shift</th><th>Effective dates</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{teamSchedules.map((schedule) => <tr key={schedule.id}>
                <td>{schedule.name || 'Team schedule'}</td><td>{schedule.teamId}</td><td>{schedule.attendanceMode}</td>
                <td>{shifts.find((shift) => shift.id === schedule.assignedShiftId)?.name || (schedule.attendanceMode === 'ROTATIONAL_SHIFT' ? 'Rotational' : 'Shift Not Assigned')}</td>
                <td>{schedule.effectiveFrom} – {schedule.effectiveUntil || 'ongoing'}</td><td>{schedule.isActive === false ? 'Inactive' : 'Active'}</td>
                <td className="att-config-actions">
                  <button type="button" className="hrms-btn-ghost" onClick={() => setTeamForm({
                    scheduleName: schedule.name || `${schedule.teamId} schedule`,
                    ...schedule,
                    effectiveUntil: schedule.effectiveUntil || '',
                  })}>Edit</button>
                  <button type="button" className="hrms-btn-ghost" disabled={schedule.isActive === false || saving} onClick={() => save('save-team-schedule', { ...schedule, isActive: false })}>Deactivate</button>
                </td>
              </tr>)}</tbody>
            </table></div>
          </section>
        </div>
      )}

      {tab === 'records' && <AttendanceRecords employees={staff} shifts={shifts} timeZone={policy.data?.timeZone} />}
      {tab === 'calendar' && <AttendancePolicySettings policy={policy} section="calendar" />}
      {tab === 'retention' && <AttendanceRetentionSettings policy={policy} />}
    </section>
  )
}
