import { formatAmount, formatText, isApplicable, summarizePayroll } from './payroll'

function BreakdownList({ title, rows, total }) {
  return (
    <div>
      <h4 className="fin-subhead">{title}</h4>
      {rows.map(([label, value]) => (
        <div className="fin-line" key={label}>
          <span>{label}</span>
          <span>{formatAmount(value)}</span>
        </div>
      ))}
      <div className="fin-line is-total">
        <span>{total[0]}</span>
        <span>{formatAmount(total[1])}</span>
      </div>
    </div>
  )
}

export default function SalaryBreakdown({ record }) {
  const totals = summarizePayroll(record)
  const payableDays =
    typeof record.workingDays === 'number' && typeof record.lopDays === 'number'
      ? record.workingDays - record.lopDays
      : null

  return (
    <div className="fin-breakdown">
      <div className="fin-breakdown-days">
        <div>
          <span className="fin-subhead">Total working days</span>
          <strong>{formatText(record.workingDays)}</strong>
        </div>
        <div>
          <span className="fin-subhead">Loss of pay days</span>
          <strong>{formatText(record.lopDays)}</strong>
        </div>
        <div>
          <span className="fin-subhead">Days payable</span>
          <strong>{formatText(payableDays)}</strong>
        </div>
      </div>

      <div className="fin-breakdown-cols">
        <BreakdownList
          title="Earnings"
          rows={[
            ['Basic', record.basic],
            ['HRA', record.hra],
            ['Allowances', record.allowances],
          ]}
          total={['Total earnings (A)', totals.gross]}
        />
        <BreakdownList
          title="Deductions"
          rows={[
            ['PF', record.pf],
            ['ESI', record.esi],
            ['Professional tax', record.professionalTax],
            ['TDS', record.tds],
            ['Other deductions', record.otherDeductions],
            ['Loss of pay', record.lopDeduction],
          ]}
          total={['Total deductions (B)', totals.totalDeductions]}
        />
      </div>

      <div className="fin-net">
        <span>Net salary payable (A − B)</span>
        <strong>{formatAmount(totals.net)}</strong>
      </div>

      {isApplicable(record.employerPf) && (
        <div className="fin-other">
          <h4 className="fin-subhead">Other components</h4>
          <div className="fin-line">
            <span>PF employer contribution</span>
            <span>{formatAmount(record.employerPf)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
