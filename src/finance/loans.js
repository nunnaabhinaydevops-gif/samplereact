export const LOAN_TYPES = ['Personal loan', 'Emergency loan', 'Education loan']

export const LOAN_LIMITS = {
  minAmount: 5000,
  maxAmount: 500000,
  minTenure: 3,
  maxTenure: 60,
  minReason: 10,
  maxReason: 300,
}

export function validateLoanRequest({ type, amount, tenureMonths, reason }) {
  if (!LOAN_TYPES.includes(type)) return 'Choose a loan type.'
  if (!Number.isInteger(amount) || amount < LOAN_LIMITS.minAmount || amount > LOAN_LIMITS.maxAmount) {
    return `Loan amount must be between ₹${LOAN_LIMITS.minAmount.toLocaleString('en-IN')} and ₹${LOAN_LIMITS.maxAmount.toLocaleString('en-IN')}.`
  }
  if (!Number.isInteger(tenureMonths) || tenureMonths < LOAN_LIMITS.minTenure || tenureMonths > LOAN_LIMITS.maxTenure) {
    return `Tenure must be between ${LOAN_LIMITS.minTenure} and ${LOAN_LIMITS.maxTenure} months.`
  }
  const length = reason.trim().length
  if (length < LOAN_LIMITS.minReason || length > LOAN_LIMITS.maxReason) {
    return `Reason must be between ${LOAN_LIMITS.minReason} and ${LOAN_LIMITS.maxReason} characters.`
  }
  return ''
}
