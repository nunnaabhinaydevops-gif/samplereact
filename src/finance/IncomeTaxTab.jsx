import FinanceField from './FinanceField'
import { useTaxSummary } from './hooks'
import { formatAmount, formatText } from './payroll'
import { financialYearLabel } from './tax'

export default function IncomeTaxTab({ uid, financialYear }) {
  const summary = useTaxSummary(uid, financialYear)

  if (summary.status === 'error') {
    return (
      <p className="me-feedback is-error" role="alert">
        Could not load income tax details: {summary.error}
      </p>
    )
  }

  if (summary.status === 'loading') return <p className="me-state">Loading income tax details…</p>

  if (!summary.data) {
    return (
      <section className="dash-card fin-card">
        <h3 className="fin-card-title">Income tax · {financialYearLabel(financialYear)}</h3>
        <p className="me-state">Tax computation for this year has not been published by HR yet.</p>
      </section>
    )
  }

  const { regime, netTaxableIncome, totalTaxPayable, taxPaid } = summary.data
  const balance =
    typeof totalTaxPayable === 'number' && typeof taxPaid === 'number' ? totalTaxPayable - taxPaid : null

  return (
    <section className="dash-card fin-card">
      <h3 className="fin-card-title">Income tax · {financialYearLabel(financialYear)}</h3>
      {regime && (
        <p className="me-feedback is-success fin-pad">Your income and tax liability are computed under the {regime}.</p>
      )}
      <dl className="fin-field-grid fin-pad">
        <FinanceField label="Tax regime" value={formatText(regime)} />
        <FinanceField label="Net taxable income" value={formatAmount(netTaxableIncome)} />
        <FinanceField label="Total tax payable" value={formatAmount(totalTaxPayable)} />
        <FinanceField label="Tax already paid" value={formatAmount(taxPaid)} />
        <FinanceField label="Balance tax" value={formatAmount(balance)} />
      </dl>
    </section>
  )
}
