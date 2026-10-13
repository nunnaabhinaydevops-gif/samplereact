import { useState } from 'react'
import { payrollEmployees, payrollMonth } from './data'
import { Chip, Kpi, Panel } from './ui'

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const PF_WAGE_CEILING = 15000
const ESI_WAGE_CEILING = 21000

function calculatePayslip(employee) {
  const gross = employee.basic + employee.hra + employee.special
  const pf = Math.round(Math.min(employee.basic, PF_WAGE_CEILING) * 0.12)
  const esi = gross <= ESI_WAGE_CEILING ? Math.round(gross * 0.0075) : 0
  const deductions = pf + esi + employee.tds
  return { gross, pf, esi, tds: employee.tds, deductions, net: gross - deductions }
}

function Line({ label, value, strong }) {
  return (
    <div className={strong ? 'hrms-line-row is-strong' : 'hrms-line-row'}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default function PayrollSection() {
  const [processed, setProcessed] = useState(false)
  const [selectedId, setSelectedId] = useState(payrollEmployees[0].id)

  const employee = payrollEmployees.find((item) => item.id === selectedId)
  const slip = calculatePayslip(employee)
  const payslips = payrollEmployees.map(calculatePayslip)
  const totalGross = payslips.reduce((sum, item) => sum + item.gross, 0)
  const totalNet = payslips.reduce((sum, item) => sum + item.net, 0)

  function downloadPayslip() {
    const lines = [
      `Payslip - ${payrollMonth}`,
      `Employee: ${employee.name} (${employee.id})`,
      '',
      `Basic: ${currency.format(employee.basic)}`,
      `HRA: ${currency.format(employee.hra)}`,
      `Special allowance: ${currency.format(employee.special)}`,
      `Gross: ${currency.format(slip.gross)}`,
      '',
      `PF: ${currency.format(slip.pf)}`,
      `ESI: ${currency.format(slip.esi)}`,
      `TDS: ${currency.format(slip.tds)}`,
      `Net pay: ${currency.format(slip.net)}`,
    ]
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `payslip-${employee.id}-${payrollMonth.replace(' ', '-')}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Panel
      title={`Payroll · ${payrollMonth}`}
      action={
        <div className="hrms-actions">
          <Chip tone={processed ? 'green' : 'amber'}>{processed ? 'Processed' : 'Draft'}</Chip>
          <button type="button" className="hrms-btn" disabled={processed} onClick={() => setProcessed(true)}>
            Process payroll
          </button>
        </div>
      }
    >
      <div className="hrms-kpis">
        <Kpi label="Employees" value={payrollEmployees.length} />
        <Kpi label="Total gross" value={currency.format(totalGross)} />
        <Kpi label="Total net pay" value={currency.format(totalNet)} tone="green" />
      </div>

      <label className="hrms-field">
        Payslip for
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {payrollEmployees.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="hrms-slip">
        <div className="hrms-stack">
          <h4 className="hrms-slip-title">Earnings</h4>
          <Line label="Basic" value={currency.format(employee.basic)} />
          <Line label="HRA" value={currency.format(employee.hra)} />
          <Line label="Special allowance" value={currency.format(employee.special)} />
          <Line label="Gross" value={currency.format(slip.gross)} strong />
        </div>
        <div className="hrms-stack">
          <h4 className="hrms-slip-title">Deductions</h4>
          <Line label="PF (12% of basic, up to ₹15,000)" value={currency.format(slip.pf)} />
          <Line label="ESI (0.75%, gross up to ₹21,000)" value={currency.format(slip.esi)} />
          <Line label="TDS (sample value)" value={currency.format(slip.tds)} />
          <Line label="Total deductions" value={currency.format(slip.deductions)} strong />
        </div>
      </div>

      <div className="hrms-line-row is-net">
        <span>Net pay</span>
        <strong>{currency.format(slip.net)}</strong>
      </div>
      <div>
        <button type="button" className="hrms-btn-ghost" onClick={downloadPayslip}>
          Download payslip
        </button>
      </div>
    </Panel>
  )
}
