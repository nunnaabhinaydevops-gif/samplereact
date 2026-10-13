import { useState } from 'react'
import { correctAttendance } from './api'
import { useAttendanceRange, useNow } from './hooks'
import { formatIstTime, toIstDateKey } from './time'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const STATUS_OPTIONS = [
  { value: 'present', label: 'Present (punches required)' },
  { value: 'leave', label: 'Leave' },
  { value: 'absent', label: 'Absent' },
]

function istInputToIso(value) {
  return value ? new Date(`${value}:00+05:30`).toISOString() : null
}

function validateCorrection(form) {
  if (!DATE_KEY.test(form.date)) return 'Choose a valid date.'
  if (form.reason.trim().length < 5) return 'Give a reason with at least 5 characters.'
  if (form.reason.trim().length > 300) return 'Reason must be 300 characters or fewer.'
  if (form.status === 'present' && !form.punchIn) return 'Punch-in time is required for a present day.'
  if (form.status !== 'present' && (form.punchIn || form.punchOut)) {
    return 'Leave and absent days cannot have punch times.'
  }
  if (form.punchIn && form.punchOut && istInputToIso(form.punchOut) <= istInputToIso(form.punchIn)) {
    return 'Punch-out must be after punch-in.'
  }
  return ''
}

export default function AttendanceCorrections({ target, viewerUid }) {
  const now = useNow()
  const todayKey = toIstDateKey(now)
  const [form, setForm] = useState({ date: todayKey, status: 'present', punchIn: '', punchOut: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const current = useAttendanceRange(target.id, form.date, form.date)
  const currentRecord = current.records[0] ?? null
  const isSelf = target.id === viewerUid
  const update = (name) => (event) => setForm({ ...form, [name]: event.target.value })

  async function handleSubmit(event) {
    event.preventDefault()
    const error = validateCorrection(form)
    if (error) {
      setFeedback({ tone: 'error', message: error })
      return
    }
    setSaving(true)
    setFeedback({ tone: '', message: '' })
    try {
      await correctAttendance({
        employeeUid: target.id,
        date: form.date,
        status: form.status,
        punchIn: istInputToIso(form.punchIn),
        punchOut: istInputToIso(form.punchOut),
        reason: form.reason.trim(),
      })
      setForm({ ...form, punchIn: '', punchOut: '', reason: '' })
      setFeedback({ tone: 'success', message: `Attendance corrected for ${form.date}.` })
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const currentSummary = currentRecord
    ? [
        currentRecord.status === 'present' ? null : currentRecord.status,
        currentRecord.punchIn && `in ${formatIstTime(currentRecord.punchIn)}`,
        currentRecord.punchOut && `out ${formatIstTime(currentRecord.punchOut)}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'no record'

  return (
    <section className="dash-card me-card">
      <div className="me-section-head">
        <h3>Attendance correction · {target.fullName || target.id}</h3>
        <span className="hrms-muted">HR only · recorded in the audit trail</span>
      </div>

      {isSelf && (
        <p className="me-feedback is-error" role="alert">
          You cannot correct your own attendance. Another HR user must make this change.
        </p>
      )}

      <p className="hrms-muted">Current record for {form.date}: {currentSummary}</p>

      {feedback.message && (
        <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      <form className="me-form me-form-grid" onSubmit={handleSubmit}>
        <label className="hrms-field">
          Date
          <input type="date" value={form.date} max={todayKey} onChange={update('date')} required />
        </label>
        <label className="hrms-field">
          Status
          <select value={form.status} onChange={update('status')}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="hrms-field">
          Punch in (IST)
          <input type="datetime-local" value={form.punchIn} onChange={update('punchIn')} />
        </label>
        <label className="hrms-field">
          Punch out (IST)
          <input type="datetime-local" value={form.punchOut} onChange={update('punchOut')} />
        </label>
        <label className="hrms-field me-span-all">
          Reason
          <textarea rows={2} maxLength={300} value={form.reason} onChange={update('reason')} required />
        </label>
        <div className="me-actions me-span-all">
          <button type="submit" className="hrms-btn" disabled={saving || isSelf}>
            {saving ? 'Saving correction…' : 'Save correction'}
          </button>
        </div>
      </form>
    </section>
  )
}
