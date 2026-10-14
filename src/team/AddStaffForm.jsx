import { useState } from 'react'
import { createStaff } from '../me/api'
import { EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES } from '../me/constants'

const TEXT_FIELDS = [
  { name: 'fullName', label: 'Full name', required: true },
  { name: 'email', label: 'Work email', type: 'email', required: true },
  { name: 'employeeId', label: 'Employee ID', required: true },
  { name: 'department', label: 'Department', required: true },
  { name: 'designation', label: 'Designation', required: true },
  { name: 'reportingManager', label: 'Reporting manager' },
  { name: 'workLocation', label: 'Work location', required: true },
]

const EMPTY_FORM = {
  fullName: '',
  email: '',
  employeeId: '',
  department: '',
  designation: '',
  reportingManager: '',
  workLocation: '',
  dateOfJoining: '',
  employmentType: '',
  employmentStatus: '',
}

export default function AddStaffForm({ onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  const update = (name) => (event) => setForm({ ...form, [name]: event.target.value })

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      setCreated(await createStaff(form))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (created) {
    return (
      <div className="team-form">
        <p className="me-feedback is-success" role="status">
          Staff account created. Share this setup link once so the employee can set their password. It will not be
          shown again.
        </p>
        <div className="team-link">
          <input type="text" readOnly value={created.setupLink} onFocus={(event) => event.target.select()} />
          <button type="button" className="hrms-btn-ghost" onClick={() => navigator.clipboard.writeText(created.setupLink)}>
            Copy link
          </button>
        </div>
        <div className="me-actions">
          <button type="button" className="hrms-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <form className="team-form me-form me-form-grid" onSubmit={handleSubmit}>
      {error && (
        <p className="me-feedback is-error me-span-all" role="alert">
          {error}
        </p>
      )}
      {TEXT_FIELDS.map((field) => (
        <label key={field.name} className="hrms-field">
          {field.label}
          <input
            type={field.type ?? 'text'}
            value={form[field.name]}
            onChange={update(field.name)}
            required={field.required}
          />
        </label>
      ))}
      <label className="hrms-field">
        Date of joining
        <input type="date" value={form.dateOfJoining} onChange={update('dateOfJoining')} required />
      </label>
      <label className="hrms-field">
        Employment type
        <select value={form.employmentType} onChange={update('employmentType')} required>
          <option value="">Select type</option>
          {EMPLOYMENT_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <label className="hrms-field">
        Employment status
        <select value={form.employmentStatus} onChange={update('employmentStatus')} required>
          <option value="">Select status</option>
          {EMPLOYMENT_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <div className="me-actions me-span-all">
        <button type="submit" className="hrms-btn" disabled={saving}>
          {saving ? 'Adding staff…' : 'Add staff'}
        </button>
        <button type="button" className="hrms-btn-ghost" onClick={onClose} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}
