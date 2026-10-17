import { useMemo, useState } from 'react'
import { manageAttendanceConfiguration } from '../me/api'
import { WEEKDAY_NAMES } from '../me/constants'
import { useAttendanceConfigurationCollection } from '../me/hooks'

const CONFIGS = {
  template: {
    title: 'Attendance Templates',
    collection: 'attendanceTemplates',
    description: 'Reusable attendance defaults for shift, time tracking, working hours, and related policies.',
    fields: [
      ['attendanceMode', 'Attendance mode', 'select', [['FLEXIBLE', 'Flexible attendance'], ['FIXED_SHIFT', 'Fixed shift'], ['ROTATIONAL_SHIFT', 'Rotational shift'], ['REMOTE_FIELD', 'Remote / field']]],
      ['assignedShiftId', 'Default shift ID', 'text'],
      ['requiredWorkingMinutes', 'Required working minutes', 'number'],
      ['breakMinutes', 'Break duration (minutes)', 'number'],
      ['clockInRequired', 'Clock in required', 'checkbox'],
      ['clockOutRequired', 'Clock out required', 'checkbox'],
      ['recordPunchTimes', 'Record actual punch timestamps', 'checkbox'],
      ['deductBreaks', 'Deduct breaks from worked duration', 'checkbox'],
      ['autoApprove', 'Auto-approve eligible attendance items', 'checkbox'],
      ['autoApproveAfterDays', 'Auto-approval delay (days)', 'number'],
      ['markAbsentPreviousDays', 'Enable previous-day absence review', 'checkbox'],
      ['absenceCheckDays', 'Absence review window (days)', 'number'],
      ['holidayPolicyId', 'Holiday policy ID', 'text'],
      ['weeklyOffPolicyId', 'Weekly off policy ID', 'text'],
      ['geofenceRequired', 'Require geofence', 'checkbox'],
      ['effectiveFrom', 'Effective from', 'date'],
      ['effectiveUntil', 'Effective until', 'date'],
      ['isActive', 'Active', 'checkbox'],
    ],
  },
  rules: {
    title: 'Attendance Rules for Holiday & Weekly Off',
    collection: 'attendanceRules',
    description: 'Define attendance and approval expectations for non-working days.',
    fields: [
      ['holidayPolicyId', 'Holiday policy ID', 'text'],
      ['weeklyOffPolicyId', 'Weekly off policy ID', 'text'],
      ['weeklyOffDays', 'Weekly off days', 'weekdays'],
      ['requireAttendanceOnHolidays', 'Require attendance on holidays', 'checkbox'],
      ['requireAttendanceOnWeeklyOffs', 'Require attendance on weekly offs', 'checkbox'],
      ['approvalRequired', 'Require approval to work on these days', 'checkbox'],
      ['applicableTeams', 'Applicable teams (comma-separated)', 'csv'],
      ['applicableEmployees', 'Applicable employee UIDs (comma-separated)', 'csv'],
      ['effectiveFrom', 'Effective from', 'date'],
      ['effectiveUntil', 'Effective until', 'date'],
      ['isActive', 'Active', 'checkbox'],
    ],
  },
  holidayPolicy: {
    title: 'Holiday Policy',
    collection: 'attendanceHolidayPolicies',
    description: 'Maintain a structured holiday calendar and assign it to the appropriate workforce.',
    fields: [
      ['effectiveYear', 'Effective year', 'number'],
      ['applicableTeams', 'Applicable teams (comma-separated)', 'csv'],
      ['applicableEmployees', 'Applicable employee UIDs (comma-separated)', 'csv'],
      ['effectiveFrom', 'Effective from', 'date'],
      ['effectiveUntil', 'Effective until', 'date'],
      ['isActive', 'Active', 'checkbox'],
    ],
    rows: { key: 'holidays', title: 'Holiday dates', fields: [['date', 'Date', 'date'], ['name', 'Holiday name', 'text']] },
  },
  leavePolicy: {
    title: 'Leave Policy',
    collection: 'attendanceLeavePolicies',
    description: 'Configure leave-policy settings without rewriting existing leave requests or historical balances.',
    fields: [
      ['accrualRule', 'Accrual rule', 'text'],
      ['carryForward', 'Allow carry forward', 'checkbox'],
      ['maximumCarryForward', 'Maximum carry-forward days', 'number'],
      ['eligibility', 'Eligibility notes', 'text'],
      ['probationRule', 'Probation rule', 'text'],
      ['approvalWorkflow', 'Approval workflow', 'text'],
      ['applicableTeams', 'Applicable teams (comma-separated)', 'csv'],
      ['applicableEmployees', 'Applicable employee UIDs (comma-separated)', 'csv'],
      ['effectiveFrom', 'Effective from', 'date'],
      ['effectiveUntil', 'Effective until', 'date'],
      ['isActive', 'Active', 'checkbox'],
    ],
    rows: { key: 'leaveTypes', title: 'Leave types and annual entitlement', fields: [['code', 'Code', 'text'], ['name', 'Leave type', 'text'], ['annualEntitlement', 'Annual days', 'number']] },
  },
  weeklyHoliday: {
    title: 'Weekly Holidays',
    collection: 'attendanceWeeklyHolidays',
    description: 'Configure effective-dated weekly off patterns for teams or employees.',
    fields: [
      ['weeklyOffDays', 'Weekly off days', 'weekdays'],
      ['applicableTeams', 'Applicable teams (comma-separated)', 'csv'],
      ['applicableEmployees', 'Applicable employee UIDs (comma-separated)', 'csv'],
      ['effectiveFrom', 'Effective from', 'date'],
      ['effectiveUntil', 'Effective until', 'date'],
      ['isActive', 'Active', 'checkbox'],
    ],
  },
  geofence: {
    title: 'Attendance Geofence Settings',
    collection: 'attendanceGeofences',
    description: 'Manage approximate location boundaries used only during an employee-initiated attendance action.',
    fields: [
      ['officeName', 'Office / branch', 'text'],
      ['latitude', 'Latitude', 'number'],
      ['longitude', 'Longitude', 'number'],
      ['radiusMetres', 'Permitted radius (metres)', 'number'],
      ['maxGpsAccuracyMetres', 'Maximum GPS accuracy (metres)', 'number'],
      ['required', 'Require location for applicable attendance', 'checkbox'],
      ['applicableTeams', 'Applicable teams (comma-separated)', 'csv'],
      ['applicableEmployees', 'Applicable employee UIDs (comma-separated)', 'csv'],
      ['effectiveFrom', 'Effective from', 'date'],
      ['effectiveUntil', 'Effective until', 'date'],
      ['isActive', 'Active', 'checkbox'],
    ],
  },
  automation: {
    title: 'Automation Rules',
    collection: 'attendanceAutomationRules',
    description: 'Configure eligibility and review safeguards for scheduled attendance processing.',
    fields: [
      ['autoApproveEnabled', 'Enable auto approval', 'checkbox'],
      ['autoApproveAfterDays', 'Auto-approval delay (days)', 'number'],
      ['eligibleTypes', 'Eligible correction types', 'approvalTypes'],
      ['manualReviewExceptions', 'Manual-review exceptions (comma-separated)', 'csv'],
      ['applicableTeams', 'Applicable teams (comma-separated)', 'csv'],
      ['applicableEmployees', 'Applicable employee UIDs (comma-separated)', 'csv'],
      ['auditAutomatedActions', 'Record automated actions in audit log', 'checkbox'],
      ['effectiveFrom', 'Effective from', 'date'],
      ['effectiveUntil', 'Effective until', 'date'],
      ['isActive', 'Active', 'checkbox'],
    ],
  },
}

const DEFAULTS = {
  template: { attendanceMode: 'FLEXIBLE', weeklyOffDays: [], recordPunchTimes: true, clockInRequired: true, clockOutRequired: true, isActive: true },
  rules: { weeklyOffDays: [], requireAttendanceOnHolidays: false, requireAttendanceOnWeeklyOffs: false, approvalRequired: true, isActive: true },
  holidayPolicy: { effectiveYear: new Date().getFullYear(), holidays: [], isActive: true },
  leavePolicy: { leaveTypes: [], carryForward: false, isActive: true },
  weeklyHoliday: { weeklyOffDays: [], applicableEmployees: [], applicableTeams: [], isActive: true },
  geofence: { latitude: '', longitude: '', radiusMetres: 150, maxGpsAccuracyMetres: 100, required: false, isActive: true },
  automation: { autoApproveEnabled: false, eligibleTypes: ['PUNCH_CORRECTION'], manualReviewExceptions: ['MISSING_PUNCH_OUT'], auditAutomatedActions: true, isActive: false },
}

function initialRecord(record) {
  const value = { ...record }
  for (const key of ['applicableTeams', 'applicableEmployees', 'manualReviewExceptions']) {
    if (Array.isArray(value[key])) value[key] = value[key].join(', ')
  }
  return value
}

function convertRecord(record, fields) {
  const output = { ...record }
  for (const [key, , type] of fields) {
    if (type === 'csv') output[key] = String(output[key] ?? '').split(',').map((item) => item.trim()).filter(Boolean)
    if (type === 'number') {
      if (output[key] === '' || output[key] == null) delete output[key]
      else output[key] = Number(output[key])
    }
  }
  return output
}

function ConfigField({ field, value, onChange, shifts, holidayPolicies, weeklyHolidayPolicies }) {
  const [name, label, type, options] = field
  if (type === 'checkbox') {
    return <label className="att-policy-check"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(name, event.target.checked)} />{label}</label>
  }
  if (type === 'weekdays') {
    const selected = Array.isArray(value) ? value : []
    return (
      <fieldset className="att-config-weekdays">
        <legend>{label}</legend>
        {WEEKDAY_NAMES.map((day, index) => (
          <label key={day}>
            <input
              type="checkbox"
              checked={selected.includes(index)}
              onChange={() => onChange(name, selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index].sort())}
            />
            {day}
          </label>
        ))}
      </fieldset>
    )
  }
  if (type === 'approvalTypes') {
    const selected = Array.isArray(value) ? value : []
    return (
      <label className="att-policy-check">
        <input
          type="checkbox"
          checked={selected.includes('PUNCH_CORRECTION')}
          onChange={() => onChange(name, selected.includes('PUNCH_CORRECTION') ? [] : ['PUNCH_CORRECTION'])}
        />
        Punch-time correction requests (missing-punch-out reviews always require HR)
      </label>
    )
  }
  const inputType = type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'select' ? 'select' : 'text'
  return (
    <label className="hrms-field">
      {label}
      {name === 'assignedShiftId' ? (
        <select value={value ?? ''} onChange={(event) => onChange(name, event.target.value)}>
          <option value="">No default shift</option>
          {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name} ({shift.code})</option>)}
        </select>
      ) : name === 'holidayPolicyId' || name === 'weeklyOffPolicyId' ? (
        <select value={value ?? ''} onChange={(event) => onChange(name, event.target.value)}>
          <option value="">Use organization default</option>
          {(name === 'holidayPolicyId' ? holidayPolicies : weeklyHolidayPolicies)
            .filter((item) => item.isActive !== false)
            .map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      ) : inputType === 'select' ? (
        <select value={value ?? ''} onChange={(event) => onChange(name, event.target.value)}>
          {options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}
        </select>
      ) : (
        <input
          type={inputType}
          value={value ?? ''}
          min={type === 'number' ? 0 : undefined}
          onChange={(event) => onChange(name, type === 'number' ? event.target.value : event.target.value)}
        />
      )}
    </label>
  )
}

export default function AttendancePolicyCatalog({
  kind,
  shifts = [],
  assignments = [],
  holidayPolicies = [],
  weeklyHolidayPolicies = [],
  people = [],
  onBack,
}) {
  const config = CONFIGS[kind]
  const data = useAttendanceConfigurationCollection(Boolean(config), config?.collection)
  const [record, setRecord] = useState(null)
  const [recordId, setRecordId] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const items = data.items
  const visibleItems = useMemo(() => items.filter((item) => item.name?.toLowerCase().includes(search.toLowerCase())), [items, search])

  function startNew() {
    setRecord({ name: '', ...DEFAULTS[kind] })
    setRecordId('')
    setFeedback({ tone: '', message: '' })
  }

  function edit(item, duplicate = false) {
    setRecord({ ...initialRecord(item), ...(duplicate ? { name: `${item.name} copy` } : {}) })
    setRecordId(duplicate ? '' : item.id)
  }

  async function persist(event) {
    event.preventDefault()
    const next = convertRecord(record, config.fields)
    if (config.rows) next[config.rows.key] = record[config.rows.key] ?? []
    setBusy(true)
    setFeedback({ tone: '', message: '' })
    try {
      await manageAttendanceConfiguration({ action: 'save-policy', kind, id: recordId || undefined, record: next })
      setRecord(null)
      setFeedback({ tone: 'success', message: `${config.title} saved. The list will refresh from Firebase.` })
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message || 'Could not save this configuration.' })
    } finally {
      setBusy(false)
    }
  }

  async function deactivate(item) {
    if (!window.confirm(`Deactivate "${item.name}"? Existing attendance history will not be changed.`)) return
    setBusy(true)
    try {
      await manageAttendanceConfiguration({ action: 'deactivate-policy', kind, id: item.id })
      setFeedback({ tone: 'success', message: `${item.name} deactivated.` })
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message || 'Could not deactivate this configuration.' })
    } finally {
      setBusy(false)
    }
  }

  function updateRecord(field, value) {
    setRecord((current) => ({ ...current, [field]: value }))
  }

  function updateRow(index, field, value) {
    const key = config.rows.key
    const rows = [...(record[key] ?? [])]
    rows[index] = { ...rows[index], [field]: value }
    updateRecord(key, rows)
  }

  if (!config) return null

  return (
    <section className="att-policy-catalog">
      <header className="att-policy-head">
        <div>
          <button type="button" className="hrms-btn-ghost att-policy-back" onClick={onBack}>‹ All settings</button>
          <h2>{config.title}</h2>
          <p className="hrms-muted">{config.description}</p>
        </div>
        <button type="button" className="hrms-btn" onClick={startNew}>+ New {kind === 'template' ? 'template' : 'configuration'}</button>
      </header>

      {feedback.message && <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
      {data.status === 'error' && <p className="me-feedback is-error" role="alert">Could not load {config.title.toLowerCase()}: {data.error}</p>}

      {record && (
        <form className="dash-card me-card att-policy-editor" onSubmit={persist}>
          <h3>{recordId ? `Edit ${record.name || config.title}` : `Create ${config.title}`}</h3>
          <label className="hrms-field">Name<input required maxLength={100} value={record.name} onChange={(event) => updateRecord('name', event.target.value)} /></label>
          {config.rows && (
            <section className="att-policy-repeatable">
              <div className="hrms-panel-head"><h3>{config.rows.title}</h3><button type="button" className="hrms-btn-ghost" onClick={() => updateRecord(config.rows.key, [...(record[config.rows.key] ?? []), {}])}>Add row</button></div>
              {(record[config.rows.key] ?? []).map((row, index) => (
                <div className="att-policy-repeat-row" key={`${config.rows.key}-${index}`}>
                  {config.rows.fields.map(([field, label, type]) => (
                    <label className="hrms-field" key={field}>{label}<input type={type} value={row[field] ?? ''} min={type === 'number' ? 0 : undefined} onChange={(event) => updateRow(index, field, type === 'number' ? event.target.value === '' ? '' : Number(event.target.value) : event.target.value)} /></label>
                  ))}
                  <button type="button" className="hrms-btn-ghost" onClick={() => updateRecord(config.rows.key, record[config.rows.key].filter((_, rowIndex) => rowIndex !== index))}>Remove</button>
                </div>
              ))}
            </section>
          )}
          <div className="att-policy-fields">
            {config.fields.map((field) => (
              <ConfigField
                key={field[0]}
                field={field}
                value={record[field[0]]}
                onChange={updateRecord}
                shifts={shifts}
                holidayPolicies={holidayPolicies}
                weeklyHolidayPolicies={weeklyHolidayPolicies}
              />
            ))}
          </div>
          {kind === 'template' && <p className="hrms-muted">Attendance mode, linked shift, linked holiday/weekly-off policies, and geofence requirements are applied to employees assigned this template. Effective working-hour thresholds and automated approval/absence options remain metadata until their processing workflow is deployed.</p>}
          {kind === 'rules' && <p className="hrms-muted">These policy values are saved for HR review. Holiday/weekly-off days affect attendance when linked through an assigned template; work-day approval workflows are not currently connected.</p>}
          {kind === 'automation' && <p className="hrms-muted">When activated, the daily Cloud Function can auto-approve only eligible punch-time correction requests after the configured delay. Missing punch-outs always require HR to enter and approve the verified time. Automated absence marking is not available.</p>}
          <div className="att-config-actions">
            <button className="hrms-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save configuration'}</button>
            <button className="hrms-btn-ghost" type="button" onClick={() => setRecord(null)} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}

      <section className="dash-card me-card att-policy-list">
        <div className="att-policy-list-head">
          <div><h3>{config.title}</h3><span className="hrms-muted">{items.length} configured</span></div>
          <input type="search" aria-label={`Search ${config.title}`} placeholder="Search settings…" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        {data.status === 'loading' ? <p className="hrms-muted">Loading saved configuration…</p> : visibleItems.length === 0 ? (
          <div className="att-policy-empty"><strong>No configurations yet</strong><span>Create a configuration to get started.</span></div>
        ) : (
          <div className="att-policy-cards">
            {visibleItems.map((item) => {
              const assignedCount = kind === 'template' ? assignments.filter((assignment) => assignment.templateId === item.id).length : null
              const createdBy = people.find((person) => person.id === item.createdBy)
              const updatedBy = people.find((person) => person.id === item.updatedBy)
              return (
                <article className="att-policy-item" key={item.id}>
                  <div className="att-policy-item-main">
                    <div><h4>{item.name}</h4><span className={`hrms-chip ${item.isActive === false ? '' : 'hrms-chip-green'}`}>{kind === 'automation' ? item.executionStatus === 'active-approval' ? 'Auto approval active' : 'Configuration only' : item.isActive === false ? 'Inactive' : 'Active'}</span></div>
                    <p className="hrms-muted">
                      {item.createdBy && <>Created by {createdBy?.fullName || item.createdBy} · </>}
                      Updated by {updatedBy?.fullName || item.updatedBy || '—'}
                      {item.updatedAt?.toDate ? ` · ${item.updatedAt.toDate().toLocaleDateString()}` : ''}
                    </p>
                    {assignedCount !== null && <p className="att-policy-assignment-count">{assignedCount} assigned employee{assignedCount === 1 ? '' : 's'}</p>}
                    {kind === 'holidayPolicy' && <p className="hrms-muted">{item.effectiveYear} · {(item.holidays ?? []).length} holiday(s)</p>}
                    {kind === 'weeklyHoliday' && <p className="hrms-muted">{(item.weeklyOffDays ?? []).map((day) => WEEKDAY_NAMES[day]).join(', ') || 'No weekly days selected'}</p>}
                    {kind === 'geofence' && <p className="hrms-muted">{item.officeName || 'Office'} · {item.radiusMetres} m radius</p>}
                  </div>
                  <div className="att-config-actions">
                    <button type="button" className="hrms-btn-ghost" onClick={() => edit(item)}>Edit</button>
                    {kind === 'template' && <button type="button" className="hrms-btn-ghost" onClick={() => edit(item, true)}>Duplicate</button>}
                    {item.isActive !== false && <button type="button" className="hrms-btn-ghost" disabled={busy} onClick={() => deactivate(item)}>Deactivate</button>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
      {kind === 'leavePolicy' && <p className="hrms-muted att-policy-integration-note">Effective matching policy entitlements are checked for new leave requests. Existing requests are not rewritten; accrual, carry-forward, probation and approval-workflow settings are stored but not executed by the current leave module.</p>}
      {kind === 'rules' && <p className="hrms-muted att-policy-integration-note">Working-on-holiday approval and attendance requirements need an approval/review workflow before they can safely alter punch eligibility.</p>}
      {kind === 'geofence' && <p className="hrms-muted att-policy-integration-note">Required geofences are checked by the trusted Clock In function for applicable active assignments. Coordinates are requested only after the employee starts Clock In, and the server calculates distance.</p>}
      {kind === 'automation' && <p className="hrms-muted att-policy-integration-note">Auto approval runs daily for eligible punch corrections only. Missing-punch-out reviews and any type listed as a manual-review exception are never auto-approved. Automated absence marking remains disabled.</p>}
    </section>
  )
}
