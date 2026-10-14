import { useState } from 'react'
import { deleteEmployee } from './api'

export default function RemoveEmployee({ person }) {
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const name = person.fullName || person.email || person.id

  async function handleRemove() {
    if (!window.confirm(`Remove ${name}? They will lose sign-in access and move to the Deleted list.`)) return
    setRemoving(true)
    setError('')
    try {
      await deleteEmployee(person.id)
    } catch (err) {
      setError(err.message)
      setRemoving(false)
    }
  }

  return (
    <section className="dash-card me-card">
      <div className="me-section-head">
        <h3>Employee has left</h3>
        <button type="button" className="hrms-btn-ghost" onClick={handleRemove} disabled={removing}>
          {removing ? 'Removing…' : 'Remove employee'}
        </button>
      </div>
      {error && (
        <p className="me-feedback is-error" role="alert">
          {error}
        </p>
      )}
      <p className="hrms-muted">
        Removed employees lose sign-in access and appear in the Deleted employees list on My Team. Super admins can
        restore them from there.
      </p>
    </section>
  )
}
