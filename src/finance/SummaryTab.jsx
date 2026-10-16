import { useState } from 'react'
import { Chip } from '../hrms/ui'
import { formatDateKey } from '../me/time'
import { submitBankDetails } from './api'
import FinanceField from './FinanceField'
import { useBankDetails } from './hooks'
import { formatAmount, formatText, isApplicable } from './payroll'

const ACCOUNT_NUMBER = /^\d{9,18}$/
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/

const VERIFICATION = {
  pending: { label: 'Pending HR verification', tone: 'amber' },
  verified: { label: 'Verified', tone: 'green' },
}

function isTextLength(value, min, max) {
  const text = value.trim()
  return text.length >= min && text.length <= max
}

function validatePayment(values) {
  if (!isTextLength(values.bankName, 2, 80)) return 'Bank name must be between 2 and 80 characters.'
  if (!ACCOUNT_NUMBER.test(values.accountNumber.trim())) return 'Account number must be 9 to 18 digits.'
  if (values.accountNumber.trim() !== values.confirmAccountNumber.trim()) return 'Account numbers do not match.'
  if (!IFSC.test(values.ifsc.trim().toUpperCase())) return 'Enter a valid IFSC code, for example HDFC0001234.'
  if (!isTextLength(values.accountHolderName, 2, 80)) return 'Account holder name must be between 2 and 80 characters.'
  if (!isTextLength(values.branch, 2, 80)) return 'Branch must be between 2 and 80 characters.'
  return ''
}

function formFromDetails(details) {
  return {
    bankName: details?.bankName ?? '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: details?.ifsc ?? '',
    accountHolderName: details?.accountHolderName ?? '',
    branch: details?.branch ?? '',
  }
}

function PayrollSummaryCard({ record, onOpenPayslip }) {
  const period =
    record?.periodStart && record?.periodEnd
      ? `${formatDateKey(record.periodStart)} – ${formatDateKey(record.periodEnd)}`
      : null

  return (
    <section className="dash-card fin-card">
      <h3 className="fin-card-title">Payroll summary</h3>
      {!record ? (
        <p className="me-state">No processed payroll cycle yet.</p>
      ) : (
        <dl className="fin-summary-grid">
          <FinanceField label="Last processed payroll cycle" value={formatText(record.cycleLabel)} />
          <FinanceField label="Payroll period" value={formatText(period)} />
          <FinanceField label="Working days" value={formatText(record.workingDays)} />
          <FinanceField label="Loss of pay (LOP) days" value={formatText(record.lopDays)} />
          <div className="fin-field">
            <dt>Payslip</dt>
            <dd>
              <button type="button" className="fin-link" onClick={() => onOpenPayslip(record.id)}>
                View payslip
              </button>
            </dd>
          </div>
        </dl>
      )}
    </section>
  )
}

function PaymentInformation({ uid }) {
  const bank = useBankDetails(uid)
  const details = bank.details
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => formFromDetails(null))
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })

  function startEditing() {
    setForm(formFromDetails(details))
    setFeedback({ tone: '', message: '' })
    setEditing(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const error = validatePayment(form)
    if (error) {
      setFeedback({ tone: 'error', message: error })
      return
    }
    setBusy(true)
    setFeedback({ tone: '', message: '' })
    try {
      await submitBankDetails({ ...form, ifsc: form.ifsc.trim().toUpperCase() })
      setEditing(false)
      setFeedback({ tone: 'success', message: 'Submitted. Your bank details stay pending until HR verifies them.' })
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const verification = VERIFICATION[details?.verificationStatus] ?? null

  return (
    <section className="dash-card fin-card">
      <div className="fin-card-head">
        <h3 className="fin-card-title">Payment information</h3>
        {!editing && (
          <button type="button" className="fin-link" onClick={startEditing}>
            Edit payment information
          </button>
        )}
      </div>

      {feedback.message && (
        <p className={`me-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      {bank.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load payment details: {bank.error}
        </p>
      )}

      {!editing && (
        <dl className="fin-field-grid">
          <FinanceField label="Payment mode" value={formatText(details?.paymentMode)} />
          <FinanceField label="Bank name" value={formatText(details?.bankName)} />
          <FinanceField label="Account number" value={formatText(details?.accountNumberMasked)} />
          <FinanceField label="IFSC code" value={formatText(details?.ifsc)} />
          <FinanceField label="Account holder name" value={formatText(details?.accountHolderName)} />
          <FinanceField label="Branch" value={formatText(details?.branch)} />
          <div className="fin-field">
            <dt>Verification</dt>
            <dd>{verification ? <Chip tone={verification.tone}>{verification.label}</Chip> : 'Not Available'}</dd>
          </div>
        </dl>
      )}

      {editing && (
        <form className="me-form me-form-grid" onSubmit={handleSubmit} noValidate>
          <label className="hrms-field">
            Bank name
            <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} required />
          </label>
          <label className="hrms-field">
            Account holder name
            <input
              value={form.accountHolderName}
              onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
              required
            />
          </label>
          <label className="hrms-field">
            Account number
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              required
            />
          </label>
          <label className="hrms-field">
            Confirm account number
            <input
              inputMode="numeric"
              autoComplete="off"
              value={form.confirmAccountNumber}
              onChange={(e) => setForm({ ...form, confirmAccountNumber: e.target.value })}
              required
            />
          </label>
          <label className="hrms-field">
            IFSC code
            <input
              value={form.ifsc}
              maxLength={11}
              onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
              required
            />
          </label>
          <label className="hrms-field">
            Branch
            <input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} required />
          </label>
          <div className="me-actions me-span-all">
            <button type="button" className="hrms-btn-ghost" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="hrms-btn" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit for verification'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function StatutorySection({ title, open, children }) {
  return (
    <details className="fin-disclosure" open={open}>
      <summary>{title}</summary>
      <dl className="fin-field-grid">{children}</dl>
    </details>
  )
}

function StatutoryInformation({ record }) {
  if (!record) {
    return (
      <section className="dash-card fin-card">
        <h3 className="fin-card-title">Statutory information</h3>
        <p className="me-state">Statutory details appear here after your first processed payroll cycle.</p>
      </section>
    )
  }

  const sections = [
    {
      title: 'PF account information',
      show: isApplicable(record.uan, record.pfNumber, record.pf, record.employerPf),
      fields: [
        ['UAN', formatText(record.uan)],
        ['PF number', formatText(record.pfNumber)],
        ['Employee PF contribution', formatAmount(record.pf)],
        ['Employer PF contribution', formatAmount(record.employerPf)],
      ],
    },
    {
      title: 'ESI account information',
      show: isApplicable(record.esiNumber, record.esi),
      fields: [
        ['ESI number', formatText(record.esiNumber)],
        ['ESI contribution', formatAmount(record.esi)],
      ],
    },
    {
      title: 'Professional tax',
      show: isApplicable(record.professionalTax),
      fields: [['Professional tax', formatAmount(record.professionalTax)]],
    },
    {
      title: 'Other statutory deductions',
      show: isApplicable(record.otherDeductions),
      fields: [['Other deductions configured by HR', formatAmount(record.otherDeductions)]],
    },
  ].filter((section) => section.show)

  return (
    <section className="dash-card fin-card">
      <h3 className="fin-card-title">Statutory information</h3>
      {sections.length === 0 && <p className="me-state">No statutory details are applicable.</p>}
      {sections.map((section, index) => (
        <StatutorySection key={section.title} title={section.title} open={index === 0}>
          {section.fields.map(([label, value]) => (
            <FinanceField key={label} label={label} value={value} />
          ))}
        </StatutorySection>
      ))}
    </section>
  )
}

export default function SummaryTab({ uid, records, onOpenPayslip }) {
  const latest = records[0] ?? null

  return (
    <div className="fin-stack">
      <PayrollSummaryCard record={latest} onOpenPayslip={onOpenPayslip} />
      <div className="fin-grid">
        <PaymentInformation uid={uid} />
        <StatutoryInformation record={latest} />
      </div>
    </div>
  )
}
