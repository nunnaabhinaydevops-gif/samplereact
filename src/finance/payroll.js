const EARNING_FIELDS = ['basic', 'hra', 'allowances']
const DEDUCTION_FIELDS = ['pf', 'esi', 'professionalTax', 'tds', 'otherDeductions', 'lopDeduction']

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function sumFields(record, fields) {
  return fields.reduce((total, field) => total + (Number(record[field]) || 0), 0)
}

export function summarizePayroll(record) {
  const gross = sumFields(record, EARNING_FIELDS)
  const totalDeductions = sumFields(record, DEDUCTION_FIELDS)
  return { gross, totalDeductions, net: gross - totalDeductions }
}

export function formatAmount(value) {
  return typeof value === 'number' ? currency.format(value) : 'Not Available'
}

export function formatText(value) {
  return value === null || value === undefined || value === '' ? 'Not Available' : String(value)
}

export function isApplicable(...values) {
  return values.some((value) => value !== null && value !== undefined && value !== '')
}
