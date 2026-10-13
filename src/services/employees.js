import { collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { ROLES } from '../lib/roles'

const employeesCollection = collection(db, 'employees')

export function subscribeToEmployees({ role, uid }, onData, onError) {
  const employeesQuery =
    role === ROLES.MANAGER
      ? query(employeesCollection, where('reportingManagerUid', '==', uid))
      : query(employeesCollection)

  return onSnapshot(
    employeesQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

function auditEntry({ action, employeeId, summary, actor }) {
  return {
    action,
    entityType: 'employee',
    entityId: employeeId,
    summary,
    actorUid: actor.uid,
    actorEmail: actor.email ?? null,
    createdAt: serverTimestamp(),
  }
}

export async function saveEmployee({ employeeId, values, actor }) {
  const ref = employeeId ? doc(employeesCollection, employeeId) : doc(employeesCollection)
  const batch = writeBatch(db)
  const stamps = { updatedAt: serverTimestamp(), updatedBy: actor.uid }
  if (!employeeId) {
    stamps.createdAt = serverTimestamp()
    stamps.createdBy = actor.uid
  }

  batch.set(ref, { ...values, ...stamps }, { merge: true })
  batch.set(
    doc(collection(db, 'audit_logs')),
    auditEntry({
      action: employeeId ? 'employee.update' : 'employee.create',
      employeeId: ref.id,
      summary: `${values.firstName} ${values.lastName} (${values.employeeCode})`,
      actor,
    }),
  )
  await batch.commit()
  return ref.id
}

export async function setEmployeeStatus({ employee, status, exitDate, actor }) {
  const batch = writeBatch(db)
  batch.update(doc(employeesCollection, employee.id), {
    employmentStatus: status,
    exitDate,
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
  })
  batch.set(
    doc(collection(db, 'audit_logs')),
    auditEntry({
      action: status === 'INACTIVE' ? 'employee.deactivate' : 'employee.reactivate',
      employeeId: employee.id,
      summary: `${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
      actor,
    }),
  )
  await batch.commit()
}
