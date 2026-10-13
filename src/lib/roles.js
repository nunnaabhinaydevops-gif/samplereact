export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HR_ADMIN: 'HR_ADMIN',
  PAYROLL_ADMIN: 'PAYROLL_ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
}

export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  HR_ADMIN: 'HR Admin',
  PAYROLL_ADMIN: 'Payroll Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
}

const ALL_ROLES = Object.values(ROLES)
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN]
const DIRECTORY_ROLES = [...ADMIN_ROLES, ROLES.PAYROLL_ADMIN, ROLES.MANAGER]
const PAYROLL_ROLES = [...ADMIN_ROLES, ROLES.PAYROLL_ADMIN]

export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', roles: ALL_ROLES },
  { key: 'employees', label: 'Employees', roles: DIRECTORY_ROLES },
  { key: 'attendance', label: 'Attendance', roles: ALL_ROLES },
  { key: 'attendance-calendar', label: 'Attendance Calendar', roles: ALL_ROLES },
  { key: 'regularization', label: 'Regularization', roles: ALL_ROLES },
  { key: 'leave', label: 'Leave Management', roles: ALL_ROLES },
  { key: 'shifts', label: 'Shift Management', roles: ADMIN_ROLES },
  { key: 'holidays', label: 'Holidays', roles: ADMIN_ROLES },
  { key: 'locations', label: 'Office Locations', roles: ADMIN_ROLES },
  { key: 'reports', label: 'Reports', roles: DIRECTORY_ROLES },
  { key: 'payroll', label: 'Payroll Summary', roles: PAYROLL_ROLES },
  { key: 'notifications', label: 'Notifications', roles: ALL_ROLES },
  { key: 'audit-logs', label: 'Audit Logs', roles: ADMIN_ROLES },
  { key: 'settings', label: 'Settings', roles: ADMIN_ROLES },
]

export function getVisibleModules(role) {
  return MODULES.filter((module) => module.roles.includes(role))
}

export function canViewDirectory(role) {
  return DIRECTORY_ROLES.includes(role)
}

export function canManageEmployees(role) {
  return ADMIN_ROLES.includes(role)
}
