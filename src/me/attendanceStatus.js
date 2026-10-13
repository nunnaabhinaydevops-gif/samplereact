export const DAY_STATUS = {
  present: { label: 'Present', tone: 'green' },
  late: { label: 'Late arrival', tone: 'amber' },
  incomplete: { label: 'Incomplete', tone: 'red' },
  absent: { label: 'Absent', tone: 'red' },
  leave: { label: 'Leave', tone: 'blue' },
  holiday: { label: 'Holiday', tone: 'holiday' },
  weekly_off: { label: 'Weekly off', tone: 'neutral' },
  working: { label: 'In progress', tone: 'blue' },
  pending: { label: 'Not punched in', tone: 'neutral' },
  upcoming: { label: 'Upcoming', tone: 'neutral' },
}

export function deriveDayStatus({ dateKey, todayKey, record, holidayName, isWeeklyOff }) {
  if (record?.status === 'leave') return 'leave'
  if (record?.status === 'absent') return 'absent'
  if (record?.punchIn) {
    if (!record.punchOut) return dateKey < todayKey ? 'incomplete' : 'working'
    return record.isLate ? 'late' : 'present'
  }
  if (holidayName) return 'holiday'
  if (isWeeklyOff) return 'weekly_off'
  if (dateKey > todayKey) return 'upcoming'
  return dateKey < todayKey ? 'absent' : 'pending'
}
