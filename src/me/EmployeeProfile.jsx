import { useRef, useState } from 'react'
import { Chip } from '../hrms/ui'
import { statusTone } from '../hrms/format'
import { saveContactDetails, uploadProfilePhoto, validateContactDetails } from './api'
import { PHOTO_TYPES } from './constants'
import Detail from './Detail'
import { usePhotoUrl } from './hooks'
import { formatDateKey } from './time'

function initialsOf(name) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'
  )
}

export default function EmployeeProfile({ user, profile, readOnly = false }) {
  const photoUrl = usePhotoUrl(profile.photoPath)
  const fullName = profile.fullName || user.displayName || user.email
  const [editing, setEditing] = useState(false)
  const [contact, setContact] = useState({ phone: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const fileInput = useRef(null)

  function startEditing() {
    setContact({ phone: profile.phone ?? '', address: profile.address ?? '' })
    setFeedback({ tone: '', message: '' })
    setEditing(true)
  }

  async function handleSave(event) {
    event.preventDefault()
    const error = validateContactDetails(contact)
    if (error) {
      setFeedback({ tone: 'error', message: error })
      return
    }
    setSaving(true)
    try {
      await saveContactDetails(profile.id, contact)
      setEditing(false)
      setFeedback({ tone: 'success', message: 'Contact details updated.' })
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    setFeedback({ tone: '', message: '' })
    try {
      await uploadProfilePhoto(profile.id, file, profile.photoPath)
      setFeedback({ tone: 'success', message: 'Profile photo updated.' })
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="dash-card me-card">
      <div className="me-profile-head">
        <div className="me-avatar-wrap">
          {photoUrl ? (
            <img className="me-avatar" src={photoUrl} alt={`${fullName} profile photo`} />
          ) : (
            <span className="me-avatar me-avatar-fallback" aria-hidden="true">
              {initialsOf(fullName)}
            </span>
          )}
          {!readOnly && (
            <>
              <button
                type="button"
                className="me-link-btn"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Change photo'}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept={PHOTO_TYPES.join(',')}
                onChange={handlePhoto}
                hidden
              />
            </>
          )}
        </div>
        <div className="me-profile-title">
          <h2>{fullName}</h2>
          <p className="me-muted">
            {profile.employeeId || 'Employee ID not set'} · {profile.designation || 'Designation not set'}
          </p>
          {profile.employmentStatus && (
            <Chip tone={statusTone[profile.employmentStatus]}>{profile.employmentStatus}</Chip>
          )}
        </div>
      </div>

      {feedback.message && (
        <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      <div className="me-section-head">
        <h3>Personal details</h3>
        {!editing && !readOnly && (
          <button type="button" className="hrms-btn-ghost" onClick={startEditing}>
            Edit phone and address
          </button>
        )}
      </div>

      {editing ? (
        <form className="me-form" onSubmit={handleSave}>
          <label className="hrms-field">
            Phone number
            <input
              type="tel"
              value={contact.phone}
              onChange={(event) => setContact({ ...contact, phone: event.target.value })}
              autoComplete="tel"
              required
            />
          </label>
          <label className="hrms-field">
            Address
            <textarea
              rows={3}
              maxLength={300}
              value={contact.address}
              onChange={(event) => setContact({ ...contact, address: event.target.value })}
            />
          </label>
          <p className="hrms-muted">Other personal details are maintained by HR.</p>
          <div className="me-actions">
            <button type="submit" className="hrms-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="hrms-btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="me-details">
          <Detail label="Full name" value={fullName} />
          <Detail label="Employee ID" value={profile.employeeId} />
          <Detail
            label="Birthday"
            value={profile.birthday ? formatDateKey(profile.birthday, { year: undefined }) : ''}
          />
          <Detail label="Email" value={profile.email || user.email} />
          <Detail label="Phone" value={profile.phone} />
          <Detail label="Address" value={profile.address} />
        </dl>
      )}
    </section>
  )
}
