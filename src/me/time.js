export const IST_TIME_ZONE = 'Asia/Kolkata'

const IST_OFFSET_MS = 330 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export function toIstDateKey(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

export function toIstMinuteOfDay(date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  return ist.getUTCHours() * 60 + ist.getUTCMinutes()
}

export function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetweenKeys(fromKey, toKey) {
  return Math.round(
    (new Date(`${toKey}T00:00:00Z`).getTime() - new Date(`${fromKey}T00:00:00Z`).getTime()) / DAY_MS,
  )
}

export function weekdayOfDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay()
}

export function mondayOfDateKey(dateKey) {
  return shiftDateKey(dateKey, -((weekdayOfDateKey(dateKey) + 6) % 7))
}

export function monthKeyOf(dateKey) {
  return dateKey.slice(0, 7)
}

export function shiftMonthKey(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7)
}

export function daysInMonthKey(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function formatDateKey(dateKey, options = {}) {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

export function formatIstTime(date, hour12 = true) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: hour12 ? 'h12' : 'h23',
  }).format(date)
}

export function formatIstClock(date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatMinutes(total) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

export function formatTimeOfDay(value) {
  const [hours, minutes] = value.split(':').map(Number)
  return new Date(Date.UTC(2000, 0, 1, hours, minutes)).toLocaleTimeString('en-IN', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function minuteOfTimeOfDay(value) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function shiftSpanMinutes(shiftStart, shiftEnd) {
  return (minuteOfTimeOfDay(shiftEnd) - minuteOfTimeOfDay(shiftStart) + 1440) % 1440
}

export function minuteOfShiftStartOffset(date, shiftStart) {
  const offset = toIstMinuteOfDay(date) - minuteOfTimeOfDay(shiftStart)
  return offset < -720 ? offset + 1440 : offset
}

export function yearsBetween(fromKey, toKey) {
  const [fromYear, fromMonth, fromDay] = fromKey.split('-').map(Number)
  const [toYear, toMonth, toDay] = toKey.split('-').map(Number)
  let years = toYear - fromYear
  if (toMonth < fromMonth || (toMonth === fromMonth && toDay < fromDay)) years -= 1
  return Math.max(0, years)
}

export function nextAnnualDateKey(anchorKey, todayKey) {
  const [, month, day] = anchorKey.split('-')
  const todayYear = Number(todayKey.slice(0, 4))
  const thisYear = annualDateKey(todayYear, month, day)
  return thisYear >= todayKey ? thisYear : annualDateKey(todayYear + 1, month, day)
}

function annualDateKey(year, month, day) {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const safeDay = month === '02' && day === '29' && !isLeap ? '28' : day
  return `${year}-${month}-${safeDay}`
}
