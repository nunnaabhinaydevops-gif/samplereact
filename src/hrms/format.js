export const statusTone = {
  Active: 'green',
  Probation: 'amber',
  Inactive: 'neutral',
  Approved: 'green',
  Pending: 'amber',
  Rejected: 'red',
  Accepted: 'green',
  Sent: 'blue',
}

export function formatDate(iso) {
  return new Date(`${iso}T00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function countDays(from, to) {
  const ms = new Date(`${to}T00:00`).getTime() - new Date(`${from}T00:00`).getTime()
  return Math.round(ms / 86400000) + 1
}

export function toIsoDate(date) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
