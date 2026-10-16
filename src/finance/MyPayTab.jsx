import { useEffect, useState } from 'react'
import { MONTH_NAMES } from '../me/constants'
import { formatDateKey } from '../me/time'
import { fetchPayslip } from './api'
import FinanceField from './FinanceField'
import { formatAmount, formatText, summarizePayroll } from './payroll'

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

function matchesFilters(record, { query, year, month }) {
  const periodEnd = record.periodEnd ?? ''
  if (year !== 'all' && periodEnd.slice(0, 4) !== year) return false
  if (month !== 'all' && periodEnd.slice(5, 7) !== month) return false
  const text = `${record.cycleLabel ?? ''} ${record.status ?? ''}`.toLowerCase()
  return text.includes(query.trim().toLowerCase())
}

function PayslipDetail({ record }) {
  const [busy, setBusy] = useState(false)
  const [pdf, setPdf] = useState(null)
  const [feedback, setFeedback] = useState('')
  const totals = summarizePayroll(record)
  const hasPdf = Boolean(record.payslipPath)

  useEffect(() => () => {
    if (pdf?.url) URL.revokeObjectURL(pdf.url)
  }, [pdf])

  async function handlePdf(mode) {
    setBusy(true)
    setFeedback('')
    try {
      const { fileName, blob } = await fetchPayslip(record.id)
      if (mode === 'download') {
        triggerDownload(blob, fileName)
      } else {
        setPdf({ fileName, url: URL.createObjectURL(blob) })
      }
    } catch (err) {
      setFeedback(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="dash-card fin-card">
      <div className="fin-card-head">
        <h3 className="fin-card-title">Payslip · {formatText(record.cycleLabel)}</h3>
        {hasPdf && (
          <div className="me-actions">
            <button type="button" className="hrms-btn-ghost" onClick={() => handlePdf('view')} disabled={busy}>
              View PDF
            </button>
            <button type="button" className="hrms-btn" onClick={() => handlePdf('download')} disabled={busy}>
              Download PDF
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <p className="me-feedback is-error" role="alert">
          {feedback}
        </p>
      )}

      <div className="fin-payslip-grid">
        <div>
          <h4 className="fin-subhead">Earnings</h4>
          <dl className="fin-field-grid">
            <FinanceField label="Basic" value={formatAmount(record.basic)} />
            <FinanceField label="HRA" value={formatAmount(record.hra)} />
            <FinanceField label="Allowances" value={formatAmount(record.allowances)} />
            <FinanceField label="Gross earnings" value={formatAmount(totals.gross)} />
          </dl>
        </div>
        <div>
          <h4 className="fin-subhead">Deductions</h4>
          <dl className="fin-field-grid">
            <FinanceField label="PF" value={formatAmount(record.pf)} />
            <FinanceField label="ESI" value={formatAmount(record.esi)} />
            <FinanceField label="Professional tax" value={formatAmount(record.professionalTax)} />
            <FinanceField label="TDS" value={formatAmount(record.tds)} />
            <FinanceField label="Other deductions" value={formatAmount(record.otherDeductions)} />
            <FinanceField label="Loss of pay" value={formatAmount(record.lopDeduction)} />
            <FinanceField label="Total deductions" value={formatAmount(totals.totalDeductions)} />
          </dl>
        </div>
      </div>

      <div className="fin-net">
        <span>Net salary</span>
        <strong>{formatAmount(totals.net)}</strong>
      </div>

      {pdf && (
        <div className="me-preview">
          <div className="me-section-head">
            <span>{pdf.fileName}</span>
            <button type="button" className="hrms-btn-ghost" onClick={() => setPdf(null)}>
              Close preview
            </button>
          </div>
          <iframe src={pdf.url} title={`Preview of ${pdf.fileName}`} />
        </div>
      )}
    </section>
  )
}

export default function MyPayTab({ records, selectedId, onSelect }) {
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [month, setMonth] = useState('all')

  const years = [...new Set(records.map((record) => (record.periodEnd ?? '').slice(0, 4)).filter(Boolean))]
  const visible = records.filter((record) => matchesFilters(record, { query, year, month }))
  const selected = records.find((record) => record.id === selectedId) ?? visible[0] ?? null

  return (
    <div className="fin-stack">
      <section className="dash-card fin-card">
        <div className="fin-toolbar">
          <label className="hrms-field">
            Search
            <input
              type="search"
              placeholder="Search payroll month or status"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
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
        </div>

        {records.length === 0 ? (
          <p className="me-state">No payroll records yet. Your processed payroll cycles will appear here.</p>
        ) : visible.length === 0 ? (
          <p className="me-state">No payroll records match these filters.</p>
        ) : (
          <div className="me-table-wrap">
            <table className="me-table fin-table">
              <thead>
                <tr>
                  <th>Payroll month</th>
                  <th>Pay period</th>
                  <th>Basic</th>
                  <th>HRA</th>
                  <th>Allowances</th>
                  <th>Gross</th>
                  <th>PF</th>
                  <th>ESI</th>
                  <th>Prof. tax</th>
                  <th>TDS</th>
                  <th>Other</th>
                  <th>LOP</th>
                  <th>Total deductions</th>
                  <th>Net salary</th>
                  <th>Status</th>
                  <th>Payslip</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((record) => {
                  const totals = summarizePayroll(record)
                  const period =
                    record.periodStart && record.periodEnd
                      ? `${formatDateKey(record.periodStart)} – ${formatDateKey(record.periodEnd)}`
                      : 'Not Available'
                  return (
                    <tr key={record.id} className={selected?.id === record.id ? 'is-selected' : undefined}>
                      <td>{formatText(record.cycleLabel)}</td>
                      <td>{period}</td>
                      <td>{formatAmount(record.basic)}</td>
                      <td>{formatAmount(record.hra)}</td>
                      <td>{formatAmount(record.allowances)}</td>
                      <td>{formatAmount(totals.gross)}</td>
                      <td>{formatAmount(record.pf)}</td>
                      <td>{formatAmount(record.esi)}</td>
                      <td>{formatAmount(record.professionalTax)}</td>
                      <td>{formatAmount(record.tds)}</td>
                      <td>{formatAmount(record.otherDeductions)}</td>
                      <td>{formatAmount(record.lopDeduction)}</td>
                      <td>{formatAmount(totals.totalDeductions)}</td>
                      <td>{formatAmount(totals.net)}</td>
                      <td>{formatText(record.status)}</td>
                      <td>
                        <button type="button" className="fin-link" onClick={() => onSelect(record.id)}>
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && <PayslipDetail key={selected.id} record={selected} />}
    </div>
  )
}
