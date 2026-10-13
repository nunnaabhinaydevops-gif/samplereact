export const workforce = { total: 128, active: 121, inactive: 7 }

export const departments = [
  { name: 'Engineering', headcount: 50 },
  { name: 'Sales', headcount: 26 },
  { name: 'Operations', headcount: 24 },
  { name: 'Marketing', headcount: 14 },
  { name: 'HR & Finance', headcount: 14 },
]

export const employees = [
  {
    id: 'EMP001',
    name: 'Priya Sharma',
    email: 'priya.sharma@atv.example',
    phone: '+91 98100 11001',
    department: 'Engineering',
    designation: 'Frontend Engineer',
    manager: 'Daniel Lee',
    joined: '2021-06-14',
    documents: 5,
    status: 'Active',
  },
  {
    id: 'EMP002',
    name: 'Daniel Lee',
    email: 'daniel.lee@atv.example',
    phone: '+91 98100 11002',
    department: 'Engineering',
    designation: 'Engineering Manager',
    manager: 'Vikram Rao',
    joined: '2019-03-18',
    documents: 6,
    status: 'Active',
  },
  {
    id: 'EMP003',
    name: 'Meera Patel',
    email: 'meera.patel@atv.example',
    phone: '+91 98100 11003',
    department: 'Sales',
    designation: 'Sales Lead',
    manager: 'Vikram Rao',
    joined: '2019-02-03',
    documents: 6,
    status: 'Active',
  },
  {
    id: 'EMP004',
    name: 'Kiran Reddy',
    email: 'kiran.reddy@atv.example',
    phone: '+91 98100 11004',
    department: 'Operations',
    designation: 'Operations Associate',
    manager: 'Vikram Rao',
    joined: '2024-09-01',
    documents: 3,
    status: 'Probation',
  },
  {
    id: 'EMP005',
    name: 'Aisha Khan',
    email: 'aisha.khan@atv.example',
    phone: '+91 98100 11005',
    department: 'Marketing',
    designation: 'Content Strategist',
    manager: 'Vikram Rao',
    joined: '2022-11-21',
    documents: 4,
    status: 'Active',
  },
  {
    id: 'EMP006',
    name: 'Rohan Gupta',
    email: 'rohan.gupta@atv.example',
    phone: '+91 98100 11006',
    department: 'HR & Finance',
    designation: 'HR Generalist',
    manager: 'Vikram Rao',
    joined: '2018-07-09',
    documents: 6,
    status: 'Inactive',
  },
]

export const attendanceToday = { present: 100, late: 11, halfDay: 4, absent: 6 }

export const regularizationRequests = [
  { id: 1, date: '2026-10-09', reason: 'Forgot to check out', status: 'Pending' },
  { id: 2, date: '2026-10-06', reason: 'Biometric device was offline', status: 'Approved' },
]

const attendancePattern = [
  'present',
  'present',
  'late',
  'present',
  'present',
  'absent',
  'present',
  'half-day',
  'present',
  'present',
]

export function buildMonthAttendance(today) {
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const weekday = new Date(year, month, day).getDay()

    if (day > today.getDate()) return { day, status: 'upcoming' }
    if (weekday === 0 || weekday === 6) return { day, status: 'weekend' }
    return { day, status: attendancePattern[index % attendancePattern.length] }
  })
}

export const leaveTypes = ['Casual leave', 'Sick leave', 'Earned leave']

export const leaveBalances = [
  { type: 'Casual leave', used: 4, total: 12 },
  { type: 'Sick leave', used: 2, total: 8 },
  { type: 'Earned leave', used: 6, total: 18 },
]

export const initialLeaveRequests = [
  {
    id: 1,
    employee: 'Meera Patel',
    type: 'Casual leave',
    from: '2026-10-20',
    to: '2026-10-21',
    status: 'Pending',
  },
  {
    id: 2,
    employee: 'Kiran Reddy',
    type: 'Sick leave',
    from: '2026-10-14',
    to: '2026-10-14',
    status: 'Pending',
  },
  { id: 3, employee: 'You', type: 'Sick leave', from: '2026-10-02', to: '2026-10-02', status: 'Approved' },
  { id: 4, employee: 'You', type: 'Earned leave', from: '2026-09-12', to: '2026-09-14', status: 'Rejected' },
]

export const holidays = [
  { date: '2026-11-02', name: 'Company Foundation Day' },
  { date: '2026-12-25', name: 'Christmas' },
]

export const payrollMonth = 'October 2026'

export const payrollEmployees = [
  { id: 'EMP001', name: 'Priya Sharma', basic: 45000, hra: 18000, special: 22000, tds: 8200 },
  { id: 'EMP003', name: 'Meera Patel', basic: 30000, hra: 12000, special: 13000, tds: 3100 },
  { id: 'EMP004', name: 'Kiran Reddy', basic: 12000, hra: 4800, special: 3200, tds: 0 },
]

export const openings = [
  {
    role: 'Senior Frontend Engineer',
    department: 'Engineering',
    openings: 2,
    candidates: 14,
    stage: 'Interviewing',
  },
  { role: 'Sales Executive', department: 'Sales', openings: 3, candidates: 22, stage: 'Screening' },
  { role: 'HR Generalist', department: 'HR & Finance', openings: 1, candidates: 8, stage: 'Offer' },
]

export const pipeline = [
  { stage: 'Applied', count: 44 },
  { stage: 'Screening', count: 18 },
  { stage: 'Interview', count: 9 },
  { stage: 'Offer', count: 3 },
  { stage: 'Joined', count: 2 },
]

export const initialInterviews = [
  {
    id: 1,
    candidate: 'Ananya Rao',
    role: 'Senior Frontend Engineer',
    when: '2026-10-15T11:00',
    panel: 'Daniel Lee',
  },
  {
    id: 2,
    candidate: 'Sameer Ali',
    role: 'Sales Executive',
    when: '2026-10-16T15:30',
    panel: 'Meera Patel',
  },
]

export const offers = [
  { id: 1, candidate: 'Neha Iyer', role: 'HR Generalist', status: 'Sent' },
  { id: 2, candidate: 'Arjun Mehta', role: 'Sales Executive', status: 'Accepted' },
]

export const onboardingTasks = [
  'Collect ID and address proof',
  'Sign offer letter',
  'Create company email and accounts',
  'Issue laptop and access cards',
  'Complete orientation session',
]

export const reviewStatus = [
  { label: 'Completed', count: 58, tone: 'green' },
  { label: 'In progress', count: 41, tone: 'amber' },
  { label: 'Not started', count: 29, tone: 'red' },
]

export const appraisalCycle = { name: 'Mid-year appraisal 2026', dueDate: '2026-12-15' }

export const goals = [
  { title: 'Ship customer portal v2', owner: 'Engineering', progress: 72 },
  { title: 'Grow qualified pipeline by 20%', owner: 'Sales', progress: 48 },
  { title: 'Cut time-to-hire to 30 days', owner: 'HR & Finance', progress: 60 },
]

export const attendanceTrend = [
  { label: 'Wk 1', value: 94 },
  { label: 'Wk 2', value: 91 },
  { label: 'Wk 3', value: 93 },
  { label: 'Wk 4', value: 89 },
  { label: 'Wk 5', value: 92 },
  { label: 'Wk 6', value: 95 },
]

export const leaversLast12Months = 5
