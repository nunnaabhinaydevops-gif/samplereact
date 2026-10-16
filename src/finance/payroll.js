const EARNING_FIELDS = ['basic', 'hra', 'allowances']
const DEDUCTION_FIELDS = ['pf', 'esi', 'professionalTax', 'tds', 'otherDeductions', 'lopDeduction']

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function sumPresent(record, fields) {
  return fields.reduce((total, field) => total + (Number(record[field]) || 0), 0)
}

export function summarizePayroll(record) {
  const earningsComplete = EARNING_FIELDS.every((field) => typeof record[field] === 'number')
  const gross = earningsComplete ? sumPresent(record, EARNING_FIELDS) : null
  const totalDeductions = sumPresent(record, DEDUCTION_FIELDS)
  return { gross, totalDeductions, net: gross === null ? null : gross - totalDeductions }
}

export function formatAmount(value) {
  return typeof value === 'number' ? currency.format(value) : 'Not Available'
}

export function formatText(value) {
  return value === null || value === undefined || value === '' ? 'Not Available' : String(value)
}

export function formatTimestamp(value) {
  const date = value?.toDate?.()
  return date
    ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not Available'
}

export function isApplicable(...values) {
  return values.some((value) => value !== null && value !== undefined && value !== '')
}
