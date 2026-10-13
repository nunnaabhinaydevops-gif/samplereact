import { Avatar, Button, Card, EmptyState, ErrorState, LoadingState } from '../components/ui'
import { Logo } from '../components/Logo'
import { useAuth } from '../hooks/useAuth'
import { useOwnEmployee } from '../hooks/useOwnEmployee'
import { TAGLINE } from '../lib/brand'
import { fullName, formatDate, todayIso } from '../lib/format'
import { ROLE_LABELS, ROLES } from '../lib/roles'

function KpiCard({ label, value, hint, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 h-1 w-10 rounded-full ${accent}`} />
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function PlaceholderCard({ title, message }) {
  return (
    <Card title={title}>
      <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{message}</p>
    </Card>
  )
}

function DepartmentBars({ employees }) {
  const counts = new Map()
  employees.forEach((employee) => {
    const department = employee.department || 'Unassigned'
    counts.set(department, (counts.get(department) ?? 0) + 1)
  })
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (rows.length === 0) return <p className="text-sm text-slate-500">No active employees yet.</p>
  const max = rows[0][1]

  return (
    <ul className="space-y-3">
      {rows.map(([department, count]) => (
        <li key={department}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-700">{department}</span>
            <span className="font-medium text-slate-900">{count}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function DirectoryHome({ directory, role, onNavigate }) {
  if (directory.status === 'loading') return <LoadingState label="Loading workforce data…" />
  if (directory.status === 'error') return <ErrorState message={directory.error} />

  const employees = directory.employees
  const month = todayIso().slice(0, 7)
  const active = employees.filter((employee) => employee.employmentStatus === 'ACTIVE')
  const joiners = employees.filter((employee) => employee.joiningDate?.startsWith(month))
  const exits = employees.filter((employee) => employee.exitDate?.startsWith(month))
  const recentJoiners = employees
    .filter((employee) => employee.joiningDate)
    .sort((a, b) => b.joiningDate.localeCompare(a.joiningDate))
    .slice(0, 5)
  const scope = role === ROLES.MANAGER ? 'Team' : 'Total'

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={`${scope} employees`} value={employees.length} hint={`${active.length} active`} accent="bg-brand-500" />
        <KpiCard label="New joiners this month" value={joiners.length} accent="bg-innovate-500" />
        <KpiCard label="Exits this month" value={exits.length} accent="bg-red-500" />
        <KpiCard label="Inactive employees" value={employees.length - active.length} accent="bg-slate-400" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Department headcount" className="xl:col-span-2">
          <DepartmentBars employees={active} />
        </Card>
        <Card
          title="Recent joiners"
          action={
            <Button variant="ghost" className="px-2 py-1" onClick={() => onNavigate('employees')}>
              View all
            </Button>
          }
        >
          {recentJoiners.length === 0 ? (
            <EmptyState title="No joiners yet" message="Employees with a joining date appear here." />
          ) : (
            <ul className="space-y-3">
              {recentJoiners.map((employee) => (
                <li key={employee.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('employees', { employeeId: employee.id })}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <Avatar name={fullName(employee)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{fullName(employee)}</span>
                      <span className="block truncate text-xs text-slate-500">{employee.designation || 'No designation'}</span>
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(employee.joiningDate)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <PlaceholderCard title="Attendance today" message="Present, late and missing-punch counts appear once attendance is connected." />
        <PlaceholderCard title="Leave requests" message="Pending leave approvals appear once leave management is connected." />
        <PlaceholderCard title="Regularization" message="Correction requests appear once attendance regularization is connected." />
      </div>
    </div>
  )
}

function EmployeeHome({ onNavigate }) {
  const own = useOwnEmployee()

  return (
    <div className="space-y-6">
      <Card title="My profile">
        {own.status === 'loading' && <LoadingState label="Loading your profile…" />}
        {own.status === 'unlinked' && (
          <EmptyState title="Profile not linked" message="Ask HR to link your sign-in to your employee record." />
        )}
        {own.status === 'missing' && <EmptyState title="Profile not found" message="Contact HR to check your employee record." />}
        {own.status === 'error' && <ErrorState message={own.error} />}
        {own.status === 'ready' && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar name={fullName(own.employee)} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-slate-900">{fullName(own.employee)}</p>
              <p className="text-sm text-slate-600">
                {[own.employee.designation, own.employee.department].filter(Boolean).join(' · ') || 'No designation yet'}
              </p>
            </div>
            <Button variant="secondary" onClick={() => onNavigate('my-profile')}>
              View profile
            </Button>
          </div>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <PlaceholderCard title="Punch in and out" message="Attendance punches and today's status appear once attendance is connected." />
        <PlaceholderCard title="Leave balance" message="Leave balances appear once leave management is connected." />
        <PlaceholderCard title="Company holidays" message="Holidays appear once the holiday calendar is configured." />
      </div>
    </div>
  )
}

export default function DashboardPage({ directory, onNavigate }) {
  const { profile, firebaseUser } = useAuth()
  const name = profile.displayName || firebaseUser.email
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const isEmployee = profile.role === ROLES.EMPLOYEE

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-2xl bg-gradient-to-r from-brand-900 via-brand-700 to-brand-500 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden rounded-xl bg-white p-2 sm:block">
            <Logo className="h-12 w-auto" />
          </div>
          <div>
            <p className="text-sm text-white/80">{today}</p>
            <h2 className="mt-1 text-2xl font-semibold">Welcome, {name}</h2>
            <p className="mt-1 text-sm text-white/80">{ROLE_LABELS[profile.role]}</p>
          </div>
        </div>
        <p className="text-sm font-medium tracking-wide text-innovate-100">{TAGLINE}</p>
      </section>

      {isEmployee ? (
        <EmployeeHome onNavigate={onNavigate} />
      ) : (
        <DirectoryHome directory={directory} role={profile.role} onNavigate={onNavigate} />
      )}
    </div>
  )
}
