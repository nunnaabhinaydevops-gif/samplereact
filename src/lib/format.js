const DATE_FORMAT = { day: '2-digit', month: 'short', year: 'numeric' }

export function fullName(employee) {
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ')
}

export function initials(name) {
  return (
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'
  )
}

export function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function formatDate(isoDate) {
  if (!isoDate) return '—'
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, DATE_FORMAT)
}

export function formatDateTime(timestamp) {
  const date = timestamp?.toDate?.()
  return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''
}
