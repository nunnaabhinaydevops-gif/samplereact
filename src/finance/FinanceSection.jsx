import { useState } from 'react'
import MyPayTab from './MyPayTab'
import SummaryTab from './SummaryTab'
import { usePayrollRecords } from './hooks'
import './finance.css'

const FINANCE_TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'pay', label: 'My Pay' },
  { id: 'tax', label: 'Manage Tax' },
  { id: 'loans', label: 'Loans' },
]

const NOT_CONFIGURED = {
  tax: {
    title: 'Manage Tax',
    text: 'Tax declarations are not set up in the HRMS yet. HR needs to configure this section before you can submit declarations here.',
  },
  loans: {
    title: 'Loans',
    text: 'Loan records are not set up in the HRMS yet. HR needs to configure this section before your loans appear here.',
  },
}

export default function FinanceSection({ user }) {
  const [tab, setTab] = useState('summary')
  const [selectedPayslipId, setSelectedPayslipId] = useState(null)
  const payroll = usePayrollRecords(user.uid)

  function openPayslip(recordId) {
    setSelectedPayslipId(recordId)
    setTab('pay')
  }

  return (
    <section className="fin-page" aria-labelledby="fin-page-title">
      <header className="fin-page-head">
        <div>
          <h2 id="fin-page-title">My Finances</h2>
          <p className="hrms-muted">Your payroll, payment details and statutory information</p>
        </div>
        <nav className="fin-tabs" aria-label="Finance sections">
          {FINANCE_TABS.map((item) => (
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
      </header>

      {payroll.status === 'loading' && <p className="me-state">Loading your finance records…</p>}

      {payroll.status === 'error' && (
        <p className="me-feedback is-error" role="alert">
          Could not load payroll records: {payroll.error}
        </p>
      )}

      {payroll.status === 'ready' && tab === 'summary' && (
        <SummaryTab uid={user.uid} records={payroll.records} onOpenPayslip={openPayslip} />
      )}

      {payroll.status === 'ready' && tab === 'pay' && (
        <MyPayTab records={payroll.records} selectedId={selectedPayslipId} onSelect={setSelectedPayslipId} />
      )}

      {(tab === 'tax' || tab === 'loans') && (
        <section className="dash-card fin-card">
          <h3 className="fin-card-title">{NOT_CONFIGURED[tab].title}</h3>
          <p className="me-state">{NOT_CONFIGURED[tab].text}</p>
        </section>
      )}
    </section>
  )
}
