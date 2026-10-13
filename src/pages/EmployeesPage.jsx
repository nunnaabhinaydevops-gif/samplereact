import { useMemo, useState } from 'react'
import { Download, UserPlus } from 'lucide-react'
import EmployeeDetails from '../components/EmployeeDetails'
import EmployeeFormModal from '../components/EmployeeFormModal'
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, LoadingState, Pagination, Select } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { describeWriteError } from '../lib/errors'
import { EMPLOYMENT_STATUS_LABELS, SORT_OPTIONS, downloadCsv, employeesToCsv, filterEmployees, sortEmployees, uniqueSorted } from '../lib/employees'
import { fullName, formatDate, todayIso } from '../lib/format'
import { canManageEmployees } from '../lib/roles'
import { setEmployeeStatus } from '../services/employees'

const PAGE_SIZE = 10
const DEFAULT_FILTERS = { query: '', status: 'ALL', department: 'ALL', sort: 'name' }

export default function EmployeesPage({ directory, route, onNavigate }) {
  const { profile, firebaseUser } = useAuth()
  const canManage = canManageEmployees(profile.role)
  const actor = { uid: firebaseUser.uid, email: firebaseUser.email }
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [formTarget, setFormTarget] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusError, setStatusError] = useState('')

  const employees = directory.employees
  const managerNames = useMemo(
    () => new Map(employees.filter((item) => item.userId).map((item) => [item.userId, fullName(item)])),
    [employees],
  )
  const departments = useMemo(() => uniqueSorted(employees.map((item) => item.department)), [employees])
  const rows = useMemo(() => sortEmployees(filterEmployees(employees, filters), filters.sort), [employees, filters])
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (directory.status === 'unavailable') {
    return (
      <EmptyState
        title="Directory not available"
        message="Your role does not include access to the employee directory."
      />
    )
  }
  if (directory.status === 'loading') return <LoadingState label="Loading employees…" />
  if (directory.status === 'error') return <ErrorState message={directory.error} />

  function updateFilters(patch) {
    setFilters((previous) => ({ ...previous, ...patch }))
    setPage(1)
  }

  async function confirmStatusChange() {
    const next = statusTarget.employmentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setStatusBusy(true)
    setStatusError('')
    try {
      await setEmployeeStatus({
        employee: statusTarget,
        status: next,
        exitDate: next === 'INACTIVE' ? todayIso() : null,
        actor,
      })
      setStatusTarget(null)
    } catch (err) {
      setStatusError(describeWriteError(err))
    } finally {
      setStatusBusy(false)
    }
  }

  function exportCsv() {
    downloadCsv(`employees-${todayIso()}.csv`, employeesToCsv(rows, managerNames))
  }

  const statusCopy = statusTarget
    ? statusTarget.employmentStatus === 'ACTIVE'
      ? {
          title: 'Deactivate employee',
          message: `${fullName(statusTarget)} will be marked inactive with today as the exit date. Their record is kept for history.`,
          confirmLabel: 'Deactivate',
          tone: 'danger',
        }
      : {
          title: 'Reactivate employee',
          message: `${fullName(statusTarget)} will be marked active again and their exit date will be cleared.`,
          confirmLabel: 'Reactivate',
          tone: 'primary',
        }
    : null

  let view
  if (route.employeeId) {
    const employee = employees.find((item) => item.id === route.employeeId)
    view = employee ? (
      <EmployeeDetails
        employee={employee}
        managerName={managerNames.get(employee.reportingManagerUid)}
        canManage={canManage}
        onEdit={() => setFormTarget({ employee })}
        onToggleStatus={() => {
          setStatusError('')
          setStatusTarget(employee)
        }}
      />
    ) : (
      <EmptyState
        title="Employee not found"
        message="This record does not exist or is outside your access."
        action={
          <Button variant="secondary" onClick={() => onNavigate('employees')}>
            Back to directory
          </Button>
        }
      />
    )
  } else {
    view = (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Employee directory</h2>
            <p className="text-sm text-slate-500">
              {employees.length} on record · {rows.length} shown
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            {canManage && (
              <Button onClick={() => setFormTarget({ employee: null })}>
                <UserPlus className="h-4 w-4" />
                Add employee
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[2fr_1fr_1fr_1fr]">
          <Input
            type="search"
            placeholder="Search name, code, email…"
            aria-label="Search employees"
            value={filters.query}
            onChange={(event) => updateFilters({ query: event.target.value })}
          />
          <Select aria-label="Filter by status" value={filters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
          <Select aria-label="Filter by department" value={filters.department} onChange={(event) => updateFilters({ department: event.target.value })}>
            <option value="ALL">All departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </Select>
          <Select aria-label="Sort employees" value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value })}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {pageRows.length === 0 ? (
            <EmptyState
              title={employees.length === 0 ? 'No employees yet' : 'No employees match'}
              message={employees.length === 0 ? 'Add the first employee to start the directory.' : 'Try a different search or clear the filters.'}
              action={
                employees.length === 0 && canManage ? (
                  <Button onClick={() => setFormTarget({ employee: null })}>Add employee</Button>
                ) : null
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Manager</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageRows.map((employee) => (
                      <tr key={employee.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onNavigate('employees', { employeeId: employee.id })}
                            className="flex items-center gap-3 text-left"
                          >
                            <Avatar name={fullName(employee)} />
                            <span>
                              <span className="block font-medium text-slate-900 hover:text-brand-700">{fullName(employee)}</span>
                              <span className="block text-xs text-slate-500">{employee.email}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{employee.employeeCode}</td>
                        <td className="px-4 py-3">
                          <span className="block text-slate-900">{employee.department || '—'}</span>
                          <span className="block text-xs text-slate-500">{employee.designation}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{managerNames.get(employee.reportingManagerUid) ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(employee.joiningDate)}</td>
                        <td className="px-4 py-3">
                          <Badge tone={employee.employmentStatus === 'ACTIVE' ? 'green' : 'red'}>
                            {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus] ?? 'Unknown'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" className="px-2 py-1" onClick={() => onNavigate('employees', { employeeId: employee.id })}>
                              View
                            </Button>
                            {canManage && (
                              <Button variant="ghost" className="px-2 py-1" onClick={() => setFormTarget({ employee })}>
                                Edit
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {view}
      {formTarget && (
        <EmployeeFormModal
          key={formTarget.employee?.id ?? 'new'}
          employee={formTarget.employee}
          employees={employees}
          actor={actor}
          onClose={() => setFormTarget(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusCopy?.title}
        message={statusCopy?.message}
        confirmLabel={statusCopy?.confirmLabel}
        tone={statusCopy?.tone}
        busy={statusBusy}
        error={statusError}
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusTarget(null)}
      />
    </>
  )
}
