import { useState } from 'react'
import { attendanceToday, buildMonthAttendance, regularizationRequests } from './data'
import { Chip, Kpi, Panel } from './ui'
import { formatDate, statusTone, toIsoDate } from './format'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const legend = [
  { status: 'present', label: 'Present', tone: 'green' },
  { status: 'late', label: 'Late', tone: 'amber' },
  { status: 'half-day', label: 'Half day', tone: 'blue' },
  { status: 'absent', label: 'Absent', tone: 'red' },
]

export default function AttendanceSection() {
  const [today] = useState(() => new Date())
  const [punches, setPunches] = useState([])
  const [requests, setRequests] = useState(regularizationRequests)

  const days = buildMonthAttendance(today)
  const leadingBlanks = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
  const monthCounts = days.reduce(
    (counts, day) => ({ ...counts, [day.status]: (counts[day.status] ?? 0) + 1 }),
    {},
  )
  const checkedIn = punches.length % 2 === 1

  function recordPunch() {
    setPunches((prev) => [
      ...prev,
      {
        type: prev.length % 2 === 0 ? 'Check-in' : 'Check-out',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  function requestRegularization() {
    setRequests((prev) => [
      { id: Date.now(), date: toIsoDate(today), reason: 'Missed punch', status: 'Pending' },
      ...prev,
    ])
  }

  return (
    <Panel title="Attendance management">
      <div className="hrms-kpis">
        <Kpi label="Present" value={attendanceToday.present} tone="green" />
        <Kpi label="Absent" value={attendanceToday.absent} tone="red" />
        <Kpi label="Late" value={attendanceToday.late} tone="amber" />
        <Kpi label="Half day" value={attendanceToday.halfDay} tone="blue" />
      </div>

      <div className="hrms-subhead">
        <span>Punches today</span>
        <button type="button" className="hrms-btn" onClick={recordPunch}>
          {checkedIn ? 'Check out' : 'Check in'}
        </button>
      </div>
      <ul className="hrms-list">
        {punches.length === 0 && <li className="hrms-muted">No punches recorded today.</li>}
        {punches.map((punch, index) => (
          <li key={index}>
            <span>{punch.type}</span>
            <span>{punch.time}</span>
          </li>
        ))}
      </ul>

      <div className="hrms-subhead">
        <span>Monthly attendance</span>
      </div>
      <div className="hrms-calendar">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="hrms-cal-head">
            {weekday}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {days.map((day) => (
          <span key={day.day} className={`hrms-day hrms-day-${day.status}`}>
            {day.day}
          </span>
        ))}
      </div>
      <div className="hrms-chips">
        {legend.map((item) => (
          <Chip key={item.status} tone={item.tone}>
            {item.label} {monthCounts[item.status] ?? 0}
          </Chip>
        ))}
      </div>

      <div className="hrms-subhead">
        <span>Regularization requests</span>
        <button type="button" className="hrms-btn-ghost" onClick={requestRegularization}>
          Request for today
        </button>
      </div>
      <ul className="hrms-list">
        {requests.map((request) => (
          <li key={request.id}>
            <span>
              {formatDate(request.date)} · {request.reason}
            </span>
            <Chip tone={statusTone[request.status]}>{request.status}</Chip>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
