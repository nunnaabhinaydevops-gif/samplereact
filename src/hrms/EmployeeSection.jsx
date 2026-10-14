import { employees, workforce } from './data'
import { Chip, Kpi, Panel } from './ui'
import { formatDate, statusTone } from './format'

export default function EmployeeSection() {
  return (
    <Panel title="Employee management" className="hrms-wide">
      <div className="hrms-kpis">
        <Kpi label="Total employees" value={workforce.total} />
        <Kpi label="Active" value={workforce.active} tone="green" />
        <Kpi label="Inactive" value={workforce.inactive} tone="red" />
      </div>
      <div className="hrms-table-wrap">
        <table className="hrms-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Reporting manager</th>
              <th>Joined</th>
              <th>Documents</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <strong>{employee.name}</strong>
                  <div className="hrms-muted">{employee.email}</div>
                  <div className="hrms-muted">{employee.phone}</div>
                </td>
                <td>{employee.department}</td>
                <td>{employee.designation}</td>
                <td>{employee.manager}</td>
                <td>{formatDate(employee.joined)}</td>
                <td>{employee.documents} files</td>
                <td>
                  <Chip tone={statusTone[employee.status]}>{employee.status}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
