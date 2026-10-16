import { LEAVE_STATUS_LABELS, LEAVE_TYPES } from './constants'
import { daysBetweenKeys, shiftDateKey, weekdayOfDateKey } from './time'

function countsByType() {
  return Object.fromEntries(LEAVE_TYPES.map((type) => [type.value, 0]))
}

function leaveDateKeys(from, to) {
  return Array.from({ length: daysBetweenKeys(from, to) + 1 }, (_, index) => shiftDateKey(from, index))
}

export function filterLeaveHistory(requests, { type, status, search }) {
  const needle = search.trim().toLowerCase()
  return requests
    .filter((request) => type === 'ALL' || request.type === type)
    .filter((request) => status === 'ALL' || request.status === status)
    .filter((request) => {
      if (!needle) return true
      const typeLabel = LEAVE_TYPES.find((option) => option.value === request.type)?.label
      return [typeLabel, LEAVE_STATUS_LABELS[request.status], request.reason, request.from, request.to]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
    .sort((a, b) => b.from.localeCompare(a.from))
}

export function summarizeLeave(requests, year) {
  const yearPrefix = `${year}-`
  const summary = {
    weekly: Array(7).fill(0),
    monthly: Array(12).fill(0),
    used: countsByType(),
    pending: countsByType(),
  }

  for (const request of requests) {
    for (const dateKey of leaveDateKeys(request.from, request.to)) {
      if (!dateKey.startsWith(yearPrefix)) continue
      if (request.status === 'APPROVED') {
        summary.weekly[(weekdayOfDateKey(dateKey) + 6) % 7] += 1
        summary.monthly[Number(dateKey.slice(5, 7)) - 1] += 1
        summary.used[request.type] += 1
      } else if (request.status === 'PENDING') {
        summary.pending[request.type] += 1
      }
    }
  }

  return summary
}
