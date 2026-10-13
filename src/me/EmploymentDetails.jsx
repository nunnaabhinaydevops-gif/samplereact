import { useState } from 'react'
import { Chip } from '../hrms/ui'
import { statusTone } from '../hrms/format'
import { saveEmploymentDetails, validateEmployment } from './api'
import { EMPLOYEE_ROLES, EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES } from './constants'
import Detail from './Detail'
import { formatDateKey, toIstDateKey, yearsBetween } from './time'

const TEXT_FIELDS = [
  { name: 'fullName', label: 'Full name' },
  { name: 'employeeId', label: 'Employee ID' },
  { name: 'department', label: 'Department' },
  { name: 'designation', label: 'Designation' },
  { name: 'reportingManager', label: 'Reporting manager' },
  { name: 'workLocation', label: 'Work location' },
]

function toFormValues(profile) {
  return {
    fullName: profile.fullName ?? '',
    employeeId: profile.employeeId ?? '',
    birthday: profile.birthday ?? '',
    dateOfJoining: profile.dateOfJoining ?? '',
    department: profile.department ?? '',
    designation: profile.designation ?? '',
    reportingManager: profile.reportingManager ?? '',
    workLocation: profile.workLocation ?? '',
    employmentType: profile.employmentType ?? '',
    employmentStatus: profile.employmentStatus ?? '',
    role: profile.role ?? 'EMPLOYEE',
  }
}

export default function EmploymentDetails({ profile, editable, canEditRole }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => toFormValues(profile))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })

  const yearsOfService = profile.dateOfJoining
    ? yearsBetween(profile.dateOfJoining, toIstDateKey(new Date()))
    : null

  function startEditing() {
    setForm(toFormValues(profile))
    setFeedback({ tone: '', message: '' })
    setEditing(true)
  }

  async function handleSave(event) {
    event.preventDefault()
    const error = validateEmployment(form, { canEditRole })
    if (error) {
      setFeedback({ tone: 'error', message: error })
      return
    }
    setSaving(true)
    try {
      await saveEmploymentDetails(profile.id, form, { canEditRole })
      setEditing(false)
      setFeedback({ tone: 'success', message: 'Employment details saved.' })
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const update = (name) => (event) => setForm({ ...form, [name]: event.target.value })

  return (
    <section className="dash-card me-card">
      <div className="me-section-head">
        <h3>{editable ? `Employment details · ${profile.fullName || profile.id}` : 'Employment details'}</h3>
        {editable && !editing && (
          <button type="button" className="hrms-btn" onClick={startEditing}>
            Edit employment
          </button>
        )}
      </div>

      {feedback.message && (
        <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      {editable && editing ? (
        <form className="me-form me-form-grid" onSubmit={handleSave}>
          {TEXT_FIELDS.map((field) => (
            <label key={field.name} className="hrms-field">
              {field.label}
              <input type="text" value={form[field.name]} onChange={update(field.name)} />
            </label>
          ))}
          <label className="hrms-field">
            Birthday
            <input type="date" value={form.birthday} onChange={update('birthday')} />
          </label>
          <label className="hrms-field">
            Date of joining
            <input type="date" value={form.dateOfJoining} onChange={update('dateOfJoining')} />
          </label>
          <label className="hrms-field">
            Employment type
            <select value={form.employmentType} onChange={update('employmentType')}>
              <option value="">Select type</option>
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="hrms-field">
            Employment status
            <select value={form.employmentStatus} onChange={update('employmentStatus')}>
              <option value="">Select status</option>
              {EMPLOYMENT_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          {canEditRole && (
            <label className="hrms-field">
              Access role
              <select value={form.role} onChange={update('role')}>
                {EMPLOYEE_ROLES.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>
          )}
          <div className="me-actions me-span-all">
            <button type="submit" className="hrms-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save employment'}
            </button>
            <button type="button" className="hrms-btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="me-details">
          <Detail label="Department" value={profile.department} />
          <Detail label="Designation" value={profile.designation} />
          <Detail label="Reporting manager" value={profile.reportingManager} />
          <Detail label="Work location" value={profile.workLocation} />
          <Detail
            label="Date of joining"
            value={profile.dateOfJoining ? formatDateKey(profile.dateOfJoining) : ''}
          />
          <Detail
            label="Years of service"
            value={yearsOfService === null ? '' : `${yearsOfService} ${yearsOfService === 1 ? 'year' : 'years'}`}
          />
          <Detail label="Employment type" value={profile.employmentType} />
          <Detail
            label="Employment status"
            value={
              profile.employmentStatus ? (
                <Chip tone={statusTone[profile.employmentStatus]}>{profile.employmentStatus}</Chip>
              ) : (
                ''
              )
            }
          />
        </dl>
      )}
    </section>
  )
}
