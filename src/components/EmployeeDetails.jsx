import { Pencil, UserCheck, UserX } from 'lucide-react'
import { EMPLOYMENT_STATUS_LABELS, EMPLOYMENT_TYPES } from '../lib/employees'
import { fullName, formatDate } from '../lib/format'
import { Avatar, Badge, Button, Card } from './ui'

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value || '—'}</dd>
    </div>
  )
}

export default function EmployeeDetails({ employee, managerName, canManage, onEdit, onToggleStatus }) {
  const name = fullName(employee)
  const isActive = employee.employmentStatus === 'ACTIVE'
  const managerLabel = managerName ?? (employee.reportingManagerUid ? 'Assigned' : null)

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-slate-900">{name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {[employee.designation, employee.department].filter(Boolean).join(' · ') || 'No designation or department'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="blue">{employee.employeeCode}</Badge>
            <Badge tone={isActive ? 'green' : 'red'}>{EMPLOYMENT_STATUS_LABELS[employee.employmentStatus] ?? 'Unknown'}</Badge>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant={isActive ? 'danger' : 'primary'} onClick={onToggleStatus}>
              {isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              {isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Contact">
          <dl className="grid grid-cols-2 gap-5">
            <Detail label="Email" value={employee.email} />
            <Detail label="Phone" value={employee.phone} />
          </dl>
        </Card>
        <Card title="Employment">
          <dl className="grid grid-cols-2 gap-5">
            <Detail label="Type" value={EMPLOYMENT_TYPES[employee.employmentType]} />
            <Detail label="Work location" value={employee.workLocation} />
            <Detail label="Joining date" value={formatDate(employee.joiningDate)} />
            <Detail label="Exit date" value={formatDate(employee.exitDate)} />
          </dl>
        </Card>
        <Card title="Reporting">
          <dl className="grid grid-cols-2 gap-5">
            <Detail label="Reporting manager" value={managerLabel} />
          </dl>
        </Card>
        <Card title="Attendance, leave and documents">
          <p className="text-sm text-slate-500">
            Shift, attendance history, leave balances and documents appear here once those modules are connected.
          </p>
        </Card>
      </div>
    </div>
  )
}
