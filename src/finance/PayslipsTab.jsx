import { useEffect, useState } from 'react'
import { MONTH_NAMES } from '../me/constants'
import { formatDateKey } from '../me/time'
import { fetchPayslip } from './api'
import FinanceField from './FinanceField'
import SalaryBreakdown from './SalaryBreakdown'
import { formatText } from './payroll'

const MONTH_OPTIONS = MONTH_NAMES.map((label, index) => ({
  value: String(index + 1).padStart(2, '0'),
  label,
}))

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

function periodLabel(record) {
  return record.periodStart && record.periodEnd
    ? `${formatDateKey(record.periodStart)} – ${formatDateKey(record.periodEnd)}`
    : 'Not Available'
}

function matchesFilters(record, { query, year, month }) {
  const periodEnd = record.periodEnd ?? ''
  if (year !== 'all' && periodEnd.slice(0, 4) !== year) return false
  if (month !== 'all' && periodEnd.slice(5, 7) !== month) return false
  const text = `${record.cycleLabel ?? ''} ${record.status ?? ''}`.toLowerCase()
  return text.includes(query.trim().toLowerCase())
}

function PdfPreview({ recordId }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let active = true
    let objectUrl = null
    setState({ status: 'loading' })
    fetchPayslip(recordId)
      .then(({ blob }) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setState({ status: 'ready', url: objectUrl })
      })
      .catch((err) => {
        if (active) setState({ status: 'error', message: err.message })
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [recordId])

  if (state.status === 'loading') return <p className="me-state">Loading payslip…</p>
  if (state.status === 'error') {
    return (
      <p className="me-feedback is-error" role="alert">
        {state.message}
      </p>
    )
  }
  return <iframe className="fin-pdf-frame" src={state.url} title="Payslip preview" />
}

function PayslipPaper({ record, employeeName }) {
  return (
    <article className="fin-paper">
      <header className="fin-paper-head">
        <h4>Payslip {formatText(record.cycleLabel)}</h4>
        <p className="fin-muted">ATV Technologies</p>
      </header>
      <dl className="fin-paper-meta">
        <FinanceField label="Employee name" value={formatText(employeeName)} />
        <FinanceField label="Pay period" value={periodLabel(record)} />
        <FinanceField label="UAN" value={formatText(record.uan)} />
        <FinanceField label="PF number" value={formatText(record.pfNumber)} />
        <FinanceField label="ESI number" value={formatText(record.esiNumber)} />
        <FinanceField label="Payroll status" value={formatText(record.status)} />
      </dl>
      <SalaryBreakdown record={record} />
      <p className="fin-paper-note">This is a computer generated statement and does not require a signature.</p>
    </article>
  )
}

function PayslipPreview({ record, employeeName }) {
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const hasPdf = Boolean(record.payslipPath)

  async function downloadPdf() {
    setBusy(true)
    setFeedback('')
    try {
      const { fileName, blob } = await fetchPayslip(record.id)
      triggerDownload(blob, fileName)
    } catch (err) {
      setFeedback(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="fin-preview">
      <header className="fin-preview-head">
        <span>Payslip · {formatText(record.cycleLabel)}</span>
        {hasPdf && (
          <button type="button" className="fin-download" onClick={downloadPdf} disabled={busy}>
            {busy ? 'Preparing…' : 'Download Payslip'}
          </button>
        )}
      </header>
      {feedback && (
        <p className="me-feedback is-error" role="alert">
          {feedback}
        </p>
      )}
      <div className="fin-preview-body">
        {hasPdf ? (
          <PdfPreview recordId={record.id} />
        ) : (
          <PayslipPaper record={record} employeeName={employeeName} />
        )}
      </div>
    </section>
  )
}

export default function PayslipsTab({ records, employeeName, selectedId, onSelect }) {
  const years = [...new Set(records.map((record) => (record.periodEnd ?? '').slice(0, 4)).filter(Boolean))]
  const [query, setQuery] = useState('')
  const [year, setYear] = useState(years[0] ?? 'all')
  const [month, setMonth] = useState('all')

  const visible = records.filter((record) => matchesFilters(record, { query, year, month }))
  const selected = records.find((record) => record.id === selectedId) ?? visible[0] ?? null

  return (
    <div className="fin-stack">
      <header className="fin-section-head">
        <h3 className="fin-card-title">Payslips</h3>
        <p className="fin-muted">View your payslips for each processed payroll cycle.</p>
      </header>

      <div className="fin-payslips">
        <aside className="fin-payslip-side">
          <div className="fin-payslip-filters">
            <label className="hrms-field">
              Year
              <select value={year} onChange={(event) => setYear(event.target.value)}>
                <option value="all">All years</option>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="hrms-field">
              Month
              <select value={month} onChange={(event) => setMonth(event.target.value)}>
                <option value="all">All months</option>
                {MONTH_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="hrms-field">
              Search
              <input
                type="search"
                placeholder="Search cycle or status"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          {records.length === 0 ? (
            <p className="me-state fin-pad">No payslips yet. Processed payroll cycles will appear here.</p>
          ) : visible.length === 0 ? (
            <p className="me-state fin-pad">No payslips match these filters.</p>
          ) : (
            <ul className="fin-payslip-list">
              {visible.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    className={selected?.id === record.id ? 'is-active' : undefined}
                    aria-current={selected?.id === record.id ? 'true' : undefined}
                    onClick={() => onSelect(record.id)}
                  >
                    <span>{formatText(record.cycleLabel)}</span>
                    <span className="fin-muted">{formatText(record.status)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {selected && <PayslipPreview key={selected.id} record={selected} employeeName={employeeName} />}
      </div>
    </div>
  )
}
