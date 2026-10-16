import { useState } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import './changePassword.css'

const MIN_LENGTH = 6
const EMPTY_FORM = { current: '', next: '', confirm: '' }

function errorMessage(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Your current password is incorrect.'
    case 'auth/weak-password':
      return `Choose a password with at least ${MIN_LENGTH} characters.`
    case 'auth/requires-recent-login':
      return 'For security, sign out and sign in again before changing your password.'
    default:
      return 'We could not update your password. Please try again.'
  }
}

function validate(form) {
  if (!form.current || !form.next || !form.confirm) return 'Fill in all three fields.'
  if (form.next.length < MIN_LENGTH) return `New password must be at least ${MIN_LENGTH} characters.`
  if (form.next !== form.confirm) return 'New password and confirmation do not match.'
  if (form.next === form.current) return 'New password must be different from your current password.'
  return ''
}

export default function ChangePassword({ user, onBack }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDone, setIsDone] = useState(false)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setIsDone(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validation = validate(form)
    if (validation) {
      setError(validation)
      return
    }

    setError('')
    setIsSaving(true)
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, form.current))
      await updatePassword(user, form.next)
      setForm(EMPTY_FORM)
      setIsDone(true)
    } catch (caught) {
      setError(errorMessage(caught.code))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="pwd">
      <button type="button" className="pwd-back" onClick={onBack}>
        <ArrowLeftIcon />
        Back to Application
      </button>

      <section className="pwd-card">
        <div className="pwd-visual" aria-hidden="true" />

        <form className="pwd-form" onSubmit={handleSubmit} noValidate>
          <h2>Change password</h2>
          <p className="pwd-hint">Enter your current password, then choose a new one.</p>

          <label className="pwd-field">
            <span>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={form.current}
              onChange={(event) => updateField('current', event.target.value)}
            />
          </label>
          <label className="pwd-field">
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.next}
              onChange={(event) => updateField('next', event.target.value)}
            />
          </label>
          <label className="pwd-field">
            <span>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) => updateField('confirm', event.target.value)}
            />
          </label>

          {error && (
            <p className="pwd-error" role="alert">
              {error}
            </p>
          )}
          {isDone && (
            <p className="pwd-success" role="status">
              Your password has been updated.
            </p>
          )}

          <button type="submit" className="pwd-submit" disabled={isSaving}>
            {isSaving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  )
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}
