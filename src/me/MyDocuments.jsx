import { useEffect, useState } from 'react'
import { Chip } from '../hrms/ui'
import { approveOfferLetter, fetchOfferLetter, uploadOfferLetter } from './api'
import { MAX_OFFER_BYTES, OFFER_TEMPLATES } from './constants'
import Detail from './Detail'
import { useEmployeeDocuments } from './hooks'
import { formatDateKey, toIstDateKey } from './time'

const DOCUMENT_STATUS = {
  draft: { label: 'Awaiting approval', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  superseded: { label: 'Replaced', tone: 'neutral' },
}

const templateLabel = (key) => OFFER_TEMPLATES.find((template) => template.key === key)?.label ?? key

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

function EmploymentSummary({ profile }) {
  return (
    <section className="dash-card me-card">
      <div className="me-section-head">
        <h3>Approved employment information</h3>
      </div>
      <dl className="me-details">
        <Detail label="Designation" value={profile.designation} />
        <Detail label="Date of joining" value={profile.dateOfJoining ? formatDateKey(profile.dateOfJoining) : ''} />
        <Detail label="Employment type" value={profile.employmentType} />
        <Detail label="Department" value={profile.department} />
      </dl>
    </section>
  )
}

function EmployeeDocuments({ profile }) {
  const documents = useEmployeeDocuments(profile.id, true)
  const [busyId, setBusyId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
  }, [preview])

  async function handleAction(document, mode) {
    setBusyId(document.id)
    setFeedback({ tone: '', message: '' })
    try {
      const { fileName, blob } = await fetchOfferLetter(document.id)
      if (mode === 'download') {
        triggerDownload(blob, fileName)
      } else {
        setPreview({ id: document.id, fileName, url: URL.createObjectURL(blob) })
      }
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setBusyId(null)
    }
  }

  const items = [...documents.items].sort((a, b) => (b.approvedAt ?? 0) - (a.approvedAt ?? 0))

  return (
    <section className="dash-card me-card">
      <div className="me-section-head">
        <h3>My offer letters</h3>
      </div>
      {feedback.message && (
        <p className={`me-feedback is-${feedback.tone}`} role="alert">
          {feedback.message}
        </p>
      )}
      {documents.status === 'loading' && <p className="me-state">Loading documents…</p>}
      {documents.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load documents: {documents.error}
        </p>
      )}
      {documents.status === 'ready' && items.length === 0 && (
        <p className="me-state">No approved offer letters yet. HR will publish yours here once it is approved.</p>
      )}

      <ul className="me-doc-list">
        {items.map((document) => (
          <li key={document.id} className="me-doc">
            <div>
              <strong>Offer letter · {document.designation}</strong>
              <p className="hrms-muted">
                {templateLabel(document.templateKey)} · Joining{' '}
                {document.joiningDate ? formatDateKey(document.joiningDate) : 'date not set'}
                {document.approvedAt && ` · Issued ${formatDateKey(toIstDateKey(document.approvedAt))}`}
              </p>
            </div>
            <div className="me-actions">
              <button
                type="button"
                className="hrms-btn-ghost"
                onClick={() => handleAction(document, 'view')}
                disabled={busyId !== null}
              >
                {busyId === document.id ? 'Opening…' : 'View'}
              </button>
              <button
                type="button"
                className="hrms-btn"
                onClick={() => handleAction(document, 'download')}
                disabled={busyId !== null}
              >
                Download
              </button>
            </div>
          </li>
        ))}
      </ul>

      {preview && (
        <div className="me-preview">
          <div className="me-section-head">
            <span>{preview.fileName}</span>
            <button type="button" className="hrms-btn-ghost" onClick={() => setPreview(null)}>
              Close preview
            </button>
          </div>
          <iframe src={preview.url} title={`Preview of ${preview.fileName}`} />
        </div>
      )}
    </section>
  )
}

function HrDocumentManager({ target, viewerUid }) {
  const documents = useEmployeeDocuments(target.id, false)
  const templates = OFFER_TEMPLATES.filter((template) => template.employmentType === target.employmentType)
  const [form, setForm] = useState({
    templateKey: templates[0]?.key ?? '',
    designation: target.designation ?? '',
    joiningDate: target.dateOfJoining ?? '',
    file: null,
  })
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const [fileInputKey, setFileInputKey] = useState(0)

  async function handleUpload(event) {
    event.preventDefault()
    if (!form.file) {
      setFeedback({ tone: 'error', message: 'Choose a PDF offer letter to upload.' })
      return
    }
    if (form.file.size > MAX_OFFER_BYTES) {
      setFeedback({ tone: 'error', message: 'PDF must be 3 MB or smaller.' })
      return
    }
    setBusy(true)
    setFeedback({ tone: '', message: '' })
    try {
      await uploadOfferLetter({
        file: form.file,
        employeeUid: target.id,
        templateKey: form.templateKey,
        designation: form.designation,
        joiningDate: form.joiningDate,
      })
      setFeedback({
        tone: 'success',
        message: 'Draft uploaded. Another HR user must approve it before the employee can see it.',
      })
      setForm({ ...form, file: null })
      setFileInputKey((key) => key + 1)
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove(documentId) {
    setBusy(true)
    setFeedback({ tone: '', message: '' })
    try {
      await approveOfferLetter(documentId)
      setFeedback({ tone: 'success', message: 'Offer letter approved and published to the employee.' })
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const items = [...documents.items].sort((a, b) => (b.uploadedAt ?? 0) - (a.uploadedAt ?? 0))

  return (
    <section className="dash-card me-card">
      <div className="me-section-head">
        <h3>HR · Offer letters for {target.fullName || target.id}</h3>
        <span className="hrms-muted">Stored in Firebase Storage; access checked by Cloud Functions</span>
      </div>

      {feedback.message && (
        <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      {templates.length === 0 ? (
        <p className="me-feedback is-error" role="alert">
          No offer template matches this employee&apos;s employment type ({target.employmentType || 'not set'}).
          Set the employment type in the employment form first.
        </p>
      ) : (
        <form className="me-form me-form-grid" onSubmit={handleUpload}>
          <label className="hrms-field">
            Template
            <select
              value={form.templateKey}
              onChange={(event) => setForm({ ...form, templateKey: event.target.value })}
            >
              {templates.map((template) => (
                <option key={template.key} value={template.key}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
          <label className="hrms-field">
            Designation on letter
            <input
              type="text"
              value={form.designation}
              onChange={(event) => setForm({ ...form, designation: event.target.value })}
              required
            />
          </label>
          <label className="hrms-field">
            Joining date
            <input
              type="date"
              value={form.joiningDate}
              onChange={(event) => setForm({ ...form, joiningDate: event.target.value })}
              required
            />
          </label>
          <label className="hrms-field">
            Offer letter (PDF, max 3 MB)
            <input
              key={fileInputKey}
              type="file"
              accept="application/pdf"
              onChange={(event) => setForm({ ...form, file: event.target.files?.[0] ?? null })}
            />
          </label>
          <div className="me-actions me-span-all">
            <button type="submit" className="hrms-btn" disabled={busy}>
              {busy ? 'Working…' : 'Upload draft'}
            </button>
          </div>
        </form>
      )}

      {documents.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load documents: {documents.error}
        </p>
      )}
      <ul className="me-doc-list">
        {items.map((document) => {
          const status = DOCUMENT_STATUS[document.status] ?? DOCUMENT_STATUS.superseded
          const canApprove = document.status === 'draft' && document.uploadedBy !== viewerUid
          return (
            <li key={document.id} className="me-doc">
              <div>
                <strong>{templateLabel(document.templateKey)} · {document.designation}</strong>
                <p className="hrms-muted">
                  {document.fileName} · uploaded{' '}
                  {document.uploadedAt ? formatDateKey(toIstDateKey(document.uploadedAt)) : 'just now'}
                </p>
              </div>
              <div className="me-actions">
                <Chip tone={status.tone}>{status.label}</Chip>
                {canApprove && (
                  <button type="button" className="hrms-btn" onClick={() => handleApprove(document.id)} disabled={busy}>
                    Approve and publish
                  </button>
                )}
                {document.status === 'draft' && document.uploadedBy === viewerUid && (
                  <span className="hrms-muted">Awaiting review by another HR user</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function MyDocuments({ profile, hrTarget, viewerUid }) {
  return (
    <>
      <EmploymentSummary profile={profile} />
      <EmployeeDocuments profile={profile} />
      {hrTarget && <HrDocumentManager key={hrTarget.id} target={hrTarget} viewerUid={viewerUid} />}
    </>
  )
}
