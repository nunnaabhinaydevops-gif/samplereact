const test = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { initializeApp, deleteApp } = require('firebase-admin/app')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')
const { archiveAndDeleteAttendance, hashValue } = require('./attendanceRetention')

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST
const projectId = process.env.GCLOUD_PROJECT || 'demo-attendance-retention'

test('Firestore emulator archives attendance and linked approval/audit history before deleting sources', {
  skip: !emulatorHost && 'Run with npm run test:emulator to exercise the Firestore adapter.',
}, async () => {
  const app = initializeApp({ projectId }, `retention-test-${randomUUID()}`)
  const db = getFirestore(app, 'hrms-attendance')
  const attendanceRef = db.collection('attendance').doc()
  const approvalRef = db.collection('attendanceApprovalItems').doc()
  const auditRef = db.collection('attendanceConfigurationAudit').doc()
  const policyRef = db.doc('hrmsSettings/attendance')
  const runId = `test-${randomUUID()}`

  try {
    await Promise.all([
      policyRef.set({ retentionDays: 365, retentionCleanupApproved: true }),
      attendanceRef.set({
        uid: 'sample-employee',
        date: '2020-01-01',
        punchIn: Timestamp.fromDate(new Date('2020-01-01T09:00:00Z')),
        punchOut: Timestamp.fromDate(new Date('2020-01-01T17:00:00Z')),
      }),
      approvalRef.set({ attendanceId: attendanceRef.id, status: 'APPROVED' }),
      auditRef.set({ attendanceId: attendanceRef.id, action: 'sample-review' }),
    ])

    const result = await archiveAndDeleteAttendance({
      db,
      FieldValue,
      policyRef,
      recordSnapshot: await attendanceRef.get(),
      runId,
      retentionDays: 365,
    })

    assert.deepEqual(result, { deleted: true, archived: true, approvalCount: 1, auditCount: 1 })
    assert.equal((await attendanceRef.get()).exists, false)
    assert.equal((await approvalRef.get()).exists, false)
    assert.equal((await auditRef.get()).exists, false)
    const archiveSnapshot = await db.collection('attendanceRetentionArchive')
      .where('attendanceId', '==', attendanceRef.id)
      .get()
    assert.equal(archiveSnapshot.size, 1)
    const archive = archiveSnapshot.docs[0].data()
    assert.equal(hashValue(archive.content), archive.contentHash)
    assert.equal(archive.content.approvals[0].id, approvalRef.id)
    assert.equal(archive.content.auditHistory[0].id, auditRef.id)
  } finally {
    const archives = await db.collection('attendanceRetentionArchive')
      .where('attendanceId', '==', attendanceRef.id)
      .get()
    const cleanup = db.batch()
    archives.docs.forEach((archive) => cleanup.delete(archive.ref))
    cleanup.delete(attendanceRef)
    cleanup.delete(approvalRef)
    cleanup.delete(auditRef)
    cleanup.delete(policyRef)
    await cleanup.commit()
    await deleteApp(app)
  }
})
