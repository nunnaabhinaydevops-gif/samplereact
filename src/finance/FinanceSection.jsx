import { useState } from 'react'
import IncomeTaxTab from './IncomeTaxTab'
import LoansTab from './LoansTab'
import MySalaryTab from './MySalaryTab'
import PayslipsTab from './PayslipsTab'
import SummaryTab from './SummaryTab'
import TaxTab from './TaxTab'
import { usePayrollRecords } from './hooks'
import { currentFinancialYear } from './tax'
import './finance.css'

const MAIN_TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'pay', label: 'My Pay' },
  { id: 'tax', label: 'Manage Tax' },
  { id: 'loans', label: 'Loans' },
]

const PAY_TABS = [
  { id: 'salary', label: 'My Salary' },
  { id: 'payslips', label: 'Payslips' },
  { id: 'income-tax', label: 'Income Tax' },
]

export default function FinanceSection({ user }) {
  const [tab, setTab] = useState('summary')
  const [paySub, setPaySub] = useState('salary')
  const [selectedPayslipId, setSelectedPayslipId] = useState(null)
  const payroll = usePayrollRecords(user.uid)

  function openPayslip(recordId) {
    setSelectedPayslipId(recordId)
    setTab('pay')
    setPaySub('payslips')
  }

  const ready = payroll.status === 'ready'
  const financialYear = currentFinancialYear()

  return (
    <section className="fin-page" aria-label="My Finances">
      <nav className="fin-tabs" aria-label="Finance sections">
        {MAIN_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'fin-tab is-active' : 'fin-tab'}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'pay' && (
        <nav className="fin-sub-tabs" aria-label="My Pay sections">
          {PAY_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={paySub === item.id ? 'fin-tab is-active' : 'fin-tab'}
              aria-current={paySub === item.id ? 'page' : undefined}
              onClick={() => setPaySub(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      {payroll.status === 'loading' && <p className="me-state">Loading your finance records…</p>}

      {payroll.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load payroll records: {payroll.error}
        </p>
      )}

      {ready && tab === 'summary' && (
        <SummaryTab uid={user.uid} records={payroll.records} onOpenPayslip={openPayslip} />
      )}

      {ready && tab === 'pay' && paySub === 'salary' && <MySalaryTab records={payroll.records} />}

      {ready && tab === 'pay' && paySub === 'payslips' && (
        <PayslipsTab
          records={payroll.records}
          employeeName={user.displayName}
          selectedId={selectedPayslipId}
          onSelect={setSelectedPayslipId}
        />
      )}

      {tab === 'pay' && paySub === 'income-tax' && <IncomeTaxTab uid={user.uid} financialYear={financialYear} />}

      {tab === 'tax' && <TaxTab uid={user.uid} financialYear={financialYear} />}

      {tab === 'loans' && <LoansTab uid={user.uid} />}
    </section>
  )
}
