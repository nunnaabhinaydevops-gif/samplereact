import { useState } from 'react'
import { saveTaxDeclaration } from './api'
import FinanceStat from './FinanceStat'
import { useTaxDeclaration, useTaxSummary } from './hooks'
import { formatAmount, formatTimestamp, formatText } from './payroll'
import { DECLARATION_SECTIONS, financialYearLabel, sectionTotal, validateDeclaration } from './tax'

const ALL_ITEMS = DECLARATION_SECTIONS.flatMap((section) => section.items)

function toFormValues(items) {
  return Object.fromEntries(ALL_ITEMS.map((item) => [item.id, items[item.id] ? String(items[item.id]) : '']))
}

function toAmounts(values) {
  return Object.fromEntries(
    Object.entries(values).map(([id, value]) => [id, value.trim() === '' ? 0 : Number(value)]),
  )
}

function TaxOverview({ summary, items, financialYear }) {
  const declared = DECLARATION_SECTIONS.reduce((total, section) => total + sectionTotal(section, items), 0)

  return (
    <section className="dash-card fin-card">
      <div className="fin-card-head">
        <h3 className="fin-card-title">Tax summary · {financialYearLabel(financialYear)}</h3>
        <span className="fin-muted">Regime: {formatText(summary?.regime)}</span>
      </div>
      <div className="fin-stats">
        <FinanceStat label="Net taxable income" value={formatAmount(summary?.netTaxableIncome)} />
        <FinanceStat label="Total tax payable" value={formatAmount(summary?.totalTaxPayable)} />
        <FinanceStat label="Tax already paid" value={formatAmount(summary?.taxPaid)} />
        <FinanceStat label="Deductions declared" value={formatAmount(declared)} />
      </div>
      {!summary && (
        <p className="me-state fin-pad">Tax computation for this year has not been published by HR yet.</p>
      )}
    </section>
  )
}

function DeclarationForm({ financialYear, saved, submittedAt }) {
  const [values, setValues] = useState(() => toFormValues(saved))
  const [activeId, setActiveId] = useState(DECLARATION_SECTIONS[0].id)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState({ tone: '', message: '' })
  const section = DECLARATION_SECTIONS.find((item) => item.id === activeId)

  function update(id) {
    return (event) => setValues((prev) => ({ ...prev, [id]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const items = toAmounts(values)
    const error = validateDeclaration(items)
    if (error) {
      setFeedback({ tone: 'error', message: error })
      return
    }

    setBusy(true)
    setFeedback({ tone: '', message: '' })
    try {
      await saveTaxDeclaration({ financialYear, items })
      setFeedback({ tone: 'success', message: 'Declaration saved.' })
    } catch (err) {
      setFeedback({ tone: 'error', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const amounts = toAmounts(values)

  return (
    <section className="dash-card fin-card">
      <h3 className="fin-card-title">My declarations</h3>
      <nav className="fin-sub-tabs" aria-label="Declaration sections">
        {DECLARATION_SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activeId === item.id ? 'fin-tab is-active' : 'fin-tab'}
            aria-current={activeId === item.id ? 'page' : undefined}
            onClick={() => setActiveId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <form className="fin-declaration" onSubmit={handleSubmit} noValidate>
        <p className="me-state fin-pad">{section.description}</p>
        <div className="me-form me-form-grid">
          {section.items.map((item) => (
            <label className="hrms-field" key={item.id}>
              {item.label}
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                max={item.max}
                value={values[item.id]}
                onChange={update(item.id)}
              />
              <span className="fin-muted">Up to ₹{item.max.toLocaleString('en-IN')}</span>
            </label>
          ))}
        </div>

        {section.combinedLimit && (
          <p className="fin-muted fin-pad">
            Combined total ₹{sectionTotal(section, amounts).toLocaleString('en-IN')} of ₹
            {section.combinedLimit.toLocaleString('en-IN')}
          </p>
        )}

        {feedback.message && (
          <p
            className={feedback.tone === 'error' ? 'me-feedback is-error fin-pad' : 'me-feedback is-success fin-pad'}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </p>
        )}

        <div className="me-actions fin-form-foot">
          <span className="fin-muted">
            {submittedAt ? `Last saved ${formatTimestamp(submittedAt)}` : 'Not saved yet'} · All sections save together
          </span>
          <button type="submit" className="hrms-btn" disabled={busy}>
            {busy ? 'Saving…' : 'Save declaration'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default function TaxTab({ uid, financialYear }) {
  const summary = useTaxSummary(uid, financialYear)
  const declaration = useTaxDeclaration(uid, financialYear)

  if (summary.status === 'error' || declaration.status === 'error') {
    return (
      <p className="me-feedback is-error" role="alert">
        Could not load tax details: {summary.error || declaration.error}
      </p>
    )
  }

  if (summary.status === 'loading' || declaration.status === 'loading') {
    return <p className="me-state">Loading your tax details…</p>
  }

  return (
    <div className="fin-stack">
      <TaxOverview summary={summary.data} items={declaration.data?.items ?? {}} financialYear={financialYear} />
      <DeclarationForm
        financialYear={financialYear}
        saved={declaration.data?.items ?? {}}
        submittedAt={declaration.data?.submittedAt}
      />
    </div>
  )
}
