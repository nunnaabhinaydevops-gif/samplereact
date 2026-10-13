import { fullName } from './format'

export const EMPLOYMENT_TYPES = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
}

export const EMPLOYMENT_STATUS_LABELS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
}

export const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'joining', label: 'Joining date (newest)' },
  { value: 'code', label: 'Employee code' },
]

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function filterEmployees(employees, { query, status, department }) {
  const term = query.trim().toLowerCase()
  return employees.filter((employee) => {
    if (status !== 'ALL' && employee.employmentStatus !== status) return false
    if (department !== 'ALL' && employee.department !== department) return false
    if (!term) return true
    return [fullName(employee), employee.employeeCode, employee.email, employee.designation].some((value) =>
      value?.toLowerCase().includes(term),
    )
  })
}

export function sortEmployees(employees, sortKey) {
  const list = [...employees]
  if (sortKey === 'joining') {
    return list.sort((a, b) => (b.joiningDate ?? '').localeCompare(a.joiningDate ?? ''))
  }
  if (sortKey === 'code') {
    return list.sort((a, b) =>
      (a.employeeCode ?? '').localeCompare(b.employeeCode ?? '', undefined, { numeric: true }),
    )
  }
  return list.sort((a, b) => fullName(a).localeCompare(fullName(b)))
}

const FORMULA_START = /^[=+\-@\t\r]/

function csvCell(value) {
  const text = value == null ? '' : String(value)
  const safe = FORMULA_START.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

const CSV_HEADER = [
  'Employee code',
  'First name',
  'Last name',
  'Email',
  'Phone',
  'Department',
  'Designation',
  'Employment type',
  'Status',
  'Joining date',
  'Exit date',
  'Work location',
  'Reporting manager',
]

export function employeesToCsv(employees, managerNames) {
  const rows = employees.map((employee) => [
    employee.employeeCode,
    employee.firstName,
    employee.lastName,
    employee.email,
    employee.phone,
    employee.department,
    employee.designation,
    EMPLOYMENT_TYPES[employee.employmentType] ?? '',
    EMPLOYMENT_STATUS_LABELS[employee.employmentStatus] ?? '',
    employee.joiningDate,
    employee.exitDate,
    employee.workLocation,
    managerNames.get(employee.reportingManagerUid) ?? '',
  ])
  return [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadCsv(filename, content) {
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
