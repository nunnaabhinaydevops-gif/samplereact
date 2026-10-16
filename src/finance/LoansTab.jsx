import { useState } from 'react'
import { Chip } from '../hrms/ui'
import { formatDateKey } from '../me/time'
import { requestLoan } from './api'
import FinanceStat from './FinanceStat'
import { useLoanRequests, useLoans } from './hooks'
import { LOAN_LIMITS, LOAN_TYPES, validateLoanRequest } from './loans'
import { formatAmount, formatText, formatTimestamp } from './payroll'

const REQUEST_STATUS = {
  pending: { label: 'Pending', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
}

const LOAN_STATUS = {
  ongoing: { label: 'Ongoing', tone: 'blue' },
  closed: { label: 'Closed', tone: 'green' },
}

function summarizeLoans(loans) {
  const ongoing = loans.filter((loan) => loan.status === 'ongoing')
  return {
    outstanding: ongoing.reduce((total, loan) => total + (loan.outstandingPrincipal ?? 0), 0),
    emi: ongoing.reduce((total, loan) => total + (loan.emi ?? 0), 0),
    ongoingCount: ongoing.length,
    totalCount: loans.length,
    totalIssued: loans.reduce((total, loan) => total + (loan.principal ?? 0), 0),
  }
}

function StatusChip({ map, status }) {
  const entry = map[status]
  return entry ? <Chip tone={entry.tone}>{entry.label}</Chip> : <span>{formatText(status)}</span>
}

function toInteger(value) {
  return value.trim() === '' ? NaN : Number(value)
}

function LoanApplicationForm({ onSubmitted }) {
  const [form, setForm] = useState({ type: LOAN_TYPES[0], amount: '', tenureMonths: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const values = {
      type: form.type,
      amount: toInteger(form.amount),
      tenureMonths: toInteger(form.tenureMonths),
      reason: form.reason,
    }
    const message = validateLoanRequest(values)
    if (message) {
      setError(message)
      return
    }

    setBusy(true)
    setError('')
    try {
      await requestLoan(values)
      onSubmitted()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="dash-card fin-card">
      <h3 className="fin-card-title">Apply for a loan</h3>
      <form className="me-form me-form-grid" onSubmit={handleSubmit} noValidate>
        <label className="hrms-field">
          Loan type
          <select value={form.type} onChange={update('type')}>
            {LOAN_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="hrms-field">
          Amount (₹)
          <input
            type="number"
            inputMode="numeric"
            min={LOAN_LIMITS.minAmount}
            max={LOAN_LIMITS.maxAmount}
            step="1"
            value={form.amount}
            onChange={update('amount')}
          />
        </label>
        <label className="hrms-field">
          Tenure (months)
          <input
            type="number"
            inputMode="numeric"
            min={LOAN_LIMITS.minTenure}
            max={LOAN_LIMITS.maxTenure}
            step="1"
            value={form.tenureMonths}
            onChange={update('tenureMonths')}
          />
        </label>
        <label className="hrms-field me-span-all">
          Reason
          <textarea rows={3} maxLength={LOAN_LIMITS.maxReason} value={form.reason} onChange={update('reason')} />
        </label>
        {error && (
          <p className="me-feedback is-error me-span-all" role="alert">
            {error}
          </p>
        )}
        <div className="me-actions me-span-all">
          <button type="submit" className="hrms-btn" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </section>
  )
}

function LoansDisbursed({ loans }) {
  if (loans.length === 0) {
    return <p className="me-state fin-pad">You have not applied for any loan till date.</p>
  }

  return (
    <div className="me-table-wrap">
      <table className="me-table fin-table">
        <thead>
          <tr>
            <th>Loan</th>
            <th>Disbursed on</th>
            <th>Principal</th>
            <th>Outstanding</th>
            <th>EMI</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id}>
              <td>{formatText(loan.type)}</td>
              <td>{formatText(loan.disbursedOn && formatDateKey(loan.disbursedOn))}</td>
              <td>{formatAmount(loan.principal)}</td>
              <td>{formatAmount(loan.outstandingPrincipal)}</td>
              <td>{formatAmount(loan.emi)}</td>
              <td>
                <StatusChip map={LOAN_STATUS} status={loan.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LoanRequests({ requests }) {
  if (requests.length === 0) return <p className="me-state fin-pad">No loan requests yet.</p>

  return (
    <div className="me-table-wrap">
      <table className="me-table fin-table">
        <thead>
          <tr>
            <th>Loan</th>
            <th>Amount</th>
            <th>Tenure</th>
            <th>Requested on</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td>{formatText(request.type)}</td>
              <td>{formatAmount(request.amount)}</td>
              <td>{formatText(request.tenureMonths && `${request.tenureMonths} months`)}</td>
              <td>{formatTimestamp(request.createdAt)}</td>
              <td>
                <StatusChip map={REQUEST_STATUS} status={request.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LoansTab({ uid }) {
  const loans = useLoans(uid)
  const requests = useLoanRequests(uid)
  const [view, setView] = useState('disbursed')
  const [applying, setApplying] = useState(false)

  if (loans.status === 'error' || requests.status === 'error') {
    return (
      <p className="me-feedback is-error" role="alert">
        Could not load loans: {loans.error || requests.error}
      </p>
    )
  }

  if (loans.status === 'loading' || requests.status === 'loading') {
    return <p className="me-state">Loading your loans…</p>
  }

  const totals = summarizeLoans(loans.records)

  return (
    <div className="fin-stack">
      <section className="dash-card fin-card">
        <div className="fin-card-head">
          <h3 className="fin-card-title">Loan summary</h3>
          <button
            type="button"
            className="hrms-btn"
            aria-expanded={applying}
            onClick={() => setApplying((open) => !open)}
          >
            {applying ? 'Close application' : 'Apply new loan'}
          </button>
        </div>
        <div className="fin-stats">
          <FinanceStat label="Outstanding principal" value={formatAmount(totals.outstanding)} />
          <FinanceStat label="Total ongoing EMI" value={formatAmount(totals.emi)} hint="Per month" />
          <FinanceStat
            label="Ongoing loans"
            value={totals.ongoingCount}
            hint={`Total loans issued: ${totals.totalCount}`}
          />
          <FinanceStat label="Total loan issued" value={formatAmount(totals.totalIssued)} />
        </div>
      </section>

      {applying && (
        <LoanApplicationForm
          onSubmitted={() => {
            setApplying(false)
            setView('requests')
          }}
        />
      )}

      <section className="dash-card fin-card">
        <nav className="fin-sub-tabs" aria-label="Loan views">
          <button
            type="button"
            className={view === 'disbursed' ? 'fin-tab is-active' : 'fin-tab'}
            aria-current={view === 'disbursed' ? 'page' : undefined}
            onClick={() => setView('disbursed')}
          >
            Loan disbursed
          </button>
          <button
            type="button"
            className={view === 'requests' ? 'fin-tab is-active' : 'fin-tab'}
            aria-current={view === 'requests' ? 'page' : undefined}
            onClick={() => setView('requests')}
          >
            Loan request
          </button>
        </nav>
        {view === 'disbursed' ? <LoansDisbursed loans={loans.records} /> : <LoanRequests requests={requests.records} />}
      </section>
    </div>
  )
}
