export const DECLARATION_SECTIONS = [
  {
    id: 'deductions80c',
    label: '1.5 Lakh Deductions',
    description: 'Section 80C investments and related deductions share one combined limit.',
    combinedLimit: 150000,
    items: [
      { id: 'ppf', label: 'Public Provident Fund (PPF)', max: 150000 },
      { id: 'elss', label: 'ELSS mutual funds', max: 150000 },
      { id: 'lifeInsurance', label: 'Life insurance premium', max: 150000 },
      { id: 'homeLoanPrincipal', label: 'Home loan principal repayment', max: 150000 },
      { id: 'tuitionFees', label: 'Children’s tuition fees', max: 150000 },
    ],
  },
  {
    id: 'otherDeductions',
    label: 'Other Deductions',
    description: 'Health insurance premiums and employee NPS contributions.',
    items: [
      { id: 'healthSelf', label: 'Health insurance: self and family (80D)', max: 25000 },
      { id: 'healthParents', label: 'Health insurance: parents (80D)', max: 50000 },
      { id: 'npsEmployee', label: 'Employee NPS contribution (80CCD(1B))', max: 50000 },
    ],
  },
  {
    id: 'houseProperty',
    label: 'House Property',
    description: 'Interest paid on a self-occupied home loan.',
    items: [{ id: 'homeLoanInterest', label: 'Home loan interest (Section 24(b))', max: 200000 }],
  },
]

export function currentFinancialYear(today = new Date()) {
  const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

export function financialYearLabel(key) {
  const startYear = Number(key.slice(0, 4))
  return `APR ${startYear} – MAR ${startYear + 1}`
}

export function sectionTotal(section, items) {
  return section.items.reduce((total, item) => total + (items[item.id] ?? 0), 0)
}

export function validateDeclaration(items) {
  for (const section of DECLARATION_SECTIONS) {
    for (const item of section.items) {
      const value = items[item.id] ?? 0
      if (!Number.isInteger(value) || value < 0) return 'Enter whole rupee amounts only.'
      if (value > item.max) return `${item.label} cannot exceed ₹${item.max.toLocaleString('en-IN')}.`
    }
    if (section.combinedLimit && sectionTotal(section, items) > section.combinedLimit) {
      return `${section.label} cannot exceed ₹${section.combinedLimit.toLocaleString('en-IN')} combined.`
    }
  }
  return ''
}
