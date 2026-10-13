import { useState } from 'react'
import { describeWriteError } from '../lib/errors'
import { EMPLOYMENT_STATUS_LABELS, EMPLOYMENT_TYPES, uniqueSorted } from '../lib/employees'
import { fullName } from '../lib/format'
import { saveEmployee } from '../services/employees'
import { Button, Field, Input, Modal, Select } from './ui'

const DEFAULT_VALUES = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  designation: '',
  employmentType: 'FULL_TIME',
  employmentStatus: 'ACTIVE',
  joiningDate: '',
  exitDate: '',
  workLocation: '',
  reportingManagerUid: '',
  userId: '',
}

const OPTIONAL_FIELDS = ['phone', 'department', 'designation', 'workLocation', 'exitDate', 'reportingManagerUid', 'userId']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function initialValues(employee) {
  if (!employee) return DEFAULT_VALUES
  return Object.fromEntries(Object.keys(DEFAULT_VALUES).map((key) => [key, employee[key] ?? DEFAULT_VALUES[key]]))
}

function validate(values, employees, editingId) {
  const errors = {}
  if (!values.employeeCode.trim()) errors.employeeCode = 'Required'
  if (!values.firstName.trim()) errors.firstName = 'Required'
  if (!values.lastName.trim()) errors.lastName = 'Required'
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address'
  if (!values.joiningDate) errors.joiningDate = 'Required'
  if (values.exitDate && values.joiningDate && values.exitDate < values.joiningDate) {
    errors.exitDate = 'Exit date cannot be before the joining date'
  }
  if (values.employmentStatus === 'INACTIVE' && !values.exitDate) {
    errors.exitDate = 'Inactive employees need an exit date'
  }
  const code = values.employeeCode.trim().toLowerCase()
  if (code && employees.some((item) => item.id !== editingId && item.employeeCode?.toLowerCase() === code)) {
    errors.employeeCode = 'Another employee already uses this code'
  }
  return errors
}

function toPayload(values) {
  const payload = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
  )
  payload.email = payload.email.toLowerCase()
  OPTIONAL_FIELDS.forEach((key) => {
    payload[key] = payload[key] || null
  })
  return payload
}

export default function EmployeeFormModal({ employee, employees, actor, onClose }) {
  const [values, setValues] = useState(() => initialValues(employee))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const isEdit = Boolean(employee)
  const managerOptions = employees.filter((item) => item.userId && item.id !== employee?.id && item.employmentStatus === 'ACTIVE')
  const departmentOptions = uniqueSorted(employees.map((item) => item.department))

  function setField(key, value) {
    setValues((previous) => ({ ...previous, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validate(values, employees, employee?.id)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    setSaveError('')
    try {
      await saveEmployee({ employeeId: employee?.id ?? null, values: toPayload(values), actor })
      onClose()
    } catch (err) {
      setSaveError(describeWriteError(err))
    } finally {
      setSaving(false)
    }
  }

  function textField(key, label, { required = false, type = 'text', hint, ...props } = {}) {
    return (
      <Field label={label} required={required} error={errors[key]} hint={hint}>
        <Input type={type} value={values[key]} onChange={(event) => setField(key, event.target.value)} {...props} />
      </Field>
    )
  }

  return (
    <Modal
      open
      wide
      title={isEdit ? `Edit ${fullName(employee)}` : 'Add employee'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="employee-form" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} noValidate className="grid gap-4 md:grid-cols-2">
        {textField('firstName', 'First name', { required: true })}
        {textField('lastName', 'Last name', { required: true })}
        {textField('email', 'Work email', { required: true, type: 'email' })}
        {textField('phone', 'Phone', { type: 'tel' })}
        {textField('employeeCode', 'Employee code', { required: true })}
        <Field label="Employment type">
          <Select value={values.employmentType} onChange={(event) => setField('employmentType', event.target.value)}>
            {Object.entries(EMPLOYMENT_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Employment status">
          <Select value={values.employmentStatus} onChange={(event) => setField('employmentStatus', event.target.value)}>
            {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {textField('joiningDate', 'Joining date', { required: true, type: 'date' })}
        {textField('exitDate', 'Exit date', { type: 'date' })}
        <Field label="Department" error={errors.department}>
          <Input list="department-options" value={values.department} onChange={(event) => setField('department', event.target.value)} />
        </Field>
        {textField('designation', 'Designation')}
        {textField('workLocation', 'Work location')}
        <Field
          label="Reporting manager"
          hint="Only active employees with a linked login can be managers."
        >
          <Select value={values.reportingManagerUid} onChange={(event) => setField('reportingManagerUid', event.target.value)}>
            <option value="">No reporting manager</option>
            {managerOptions.map((manager) => (
              <option key={manager.userId} value={manager.userId}>
                {`${fullName(manager)} (${manager.employeeCode})`}
              </option>
            ))}
          </Select>
        </Field>
        {textField('userId', 'Login user ID', {
          hint: 'Firebase Authentication UID. Links this record to the employee’s sign-in so they can open their own profile.',
        })}
        {saveError && (
          <p role="alert" className="text-sm text-red-700 md:col-span-2">
            {saveError}
          </p>
        )}
      </form>
      <datalist id="department-options">
        {departmentOptions.map((department) => (
          <option key={department} value={department} />
        ))}
      </datalist>
    </Modal>
  )
}
