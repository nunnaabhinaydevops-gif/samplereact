export const HR_ROLES = ['SUPER_ADMIN', 'HR']
export const EMPLOYEE_ROLES = ['SUPER_ADMIN', 'HR', 'EMPLOYEE']
export const EMPLOYMENT_STATUSES = ['Probation', 'Active', 'Inactive']
export const EMPLOYMENT_TYPES = ['Full-time', 'Contract', 'Intern']

export const OFFER_TEMPLATES = [
  { key: 'full-time-standard', label: 'Full-time · Standard', employmentType: 'Full-time' },
  { key: 'full-time-senior', label: 'Full-time · Senior role', employmentType: 'Full-time' },
  { key: 'contract', label: 'Contract', employmentType: 'Contract' },
  { key: 'internship', label: 'Internship', employmentType: 'Intern' },
]

export const WORK_LOCATIONS = [
  { value: 'OFFICE', label: 'Office' },
  { value: 'REMOTE', label: 'Remote' },
]

export function workLocationLabel(value) {
  return WORK_LOCATIONS.find((location) => location.value === value)?.label ?? value
}

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024
export const MAX_OFFER_BYTES = 3 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
