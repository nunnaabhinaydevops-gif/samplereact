const test = require('node:test')
const assert = require('node:assert/strict')
const {
  archiveAndDeleteAttendance,
  hashValue,
  retentionExclusion,
} = require('./attendanceRetention')

class Snapshot {
  constructor(ref, data) {
    this.ref = ref
    this.id = ref.id
    this.exists = data !== undefined
    this.value = data === undefined ? undefined : structuredClone(data)
  }

  data() {
    return this.value
  }

  get(key) {
    return this.value?.[key]
  }
}

function fakeFirestore({
  pending = false,
  corruptArchive = false,
  mutateBeforeTransaction = false,
  failTransactionOnce = false,
  pauseBeforeTransaction = false,
} = {}) {
  const collections = new Map([
    ['attendance', new Map([['attendance-1', {
      uid: 'employee-1',
      date: '2020-01-01',
      punchIn: new Date('2020-01-01T09:00:00Z'),
      punchOut: new Date('2020-01-01T17:00:00Z'),
    }]])],
    ['attendanceApprovalItems', new Map([['approval-1', {
      attendanceId: 'attendance-1',
      status: pending ? 'PENDING' : 'APPROVED',
    }]])],
    ['attendanceConfigurationAudit', new Map([['audit-1', {
      attendanceId: 'attendance-1',
      action: 'reviewed',
    }]])],
    ['attendanceRetentionArchive', new Map()],
    ['hrmsSettings', new Map([['attendance', {
      retentionDays: 365,
      retentionCleanupApproved: true,
    }]])],
  ])
  let archiveReads = 0
  let shouldMutate = mutateBeforeTransaction
  let shouldFailTransaction = failTransactionOnce
  let shouldPause = pauseBeforeTransaction

  function reference(collectionName, id) {
    return {
      id,
      collectionName,
      async get() {
        const data = collections.get(collectionName).get(id)
        if (collectionName === 'attendanceRetentionArchive') {
          archiveReads += 1
          if (corruptArchive && archiveReads === 2) {
            return new Snapshot(this, {
              ...data,
              content: { ...data.content, attendance: { id: 'tampered', data: {} } },
            })
          }
        }
        return new Snapshot(this, data)
      },
      async create(value) {
        const collectionData = collections.get(collectionName)
        if (collectionData.has(id)) throw new Error('already exists')
        collectionData.set(id, structuredClone(value))
      },
    }
  }

  const db = {
    doc(path) {
      const [collectionName, id] = path.split('/')
      return reference(collectionName, id)
    },
    collection(collectionName) {
      return {
        doc(id) {
          return reference(collectionName, id)
        },
        where(field, operator, value) {
          assert.equal(operator, '==')
          return {
            async get() {
              const docs = []
              for (const [id, data] of collections.get(collectionName)) {
                if (data[field] === value) docs.push(new Snapshot(reference(collectionName, id), data))
              }
              return { docs }
            },
          }
        },
      }
    },
    async runTransaction(callback) {
      if (shouldMutate) {
        collections.get('attendance').get('attendance-1').note = 'Updated during archive verification.'
        shouldMutate = false
      }
      if (shouldPause) {
        collections.get('hrmsSettings').get('attendance').retentionCleanupApproved = false
        shouldPause = false
      }
      const deletions = []
      const transaction = {
        get(ref) { return ref.get() },
        delete(ref) {
          deletions.push(ref)
        },
      }
      await callback(transaction)
      if (shouldFailTransaction) {
        shouldFailTransaction = false
        throw new Error('Transient transaction failure')
      }
      for (const ref of deletions) collections.get(ref.collectionName).delete(ref.id)
    },
  }

  return {
    db,
    policyRef: db.doc('hrmsSettings/attendance'),
    collections,
    FieldValue: { serverTimestamp: () => new Date('2020-01-02T00:00:00Z') },
    async recordSnapshot() {
      return reference('attendance', 'attendance-1').get()
    },
  }
}

test('hashValue is stable across object key order and changes with content', () => {
  assert.equal(hashValue({ b: 2, a: 1 }), hashValue({ a: 1, b: 2 }))
  assert.notEqual(hashValue({ a: 1 }), hashValue({ a: 2 }))
})

test('retentionExclusion protects active punch sessions', () => {
  assert.equal(retentionExclusion({ punchIn: new Date(), punchOut: null }, []), 'active-session')
  assert.equal(retentionExclusion({ punchIn: new Date(), punchOut: new Date() }, []), '')
})

test('retentionExclusion protects pending approval requests', () => {
  assert.equal(retentionExclusion({ punchIn: new Date(), punchOut: new Date() }, [{ status: 'PENDING' }]), 'pending-approval')
  assert.equal(retentionExclusion({}, [{ status: 'APPROVED' }]), '')
})

test('retentionExclusion protects explicit investigation holds', () => {
  assert.equal(retentionExclusion({ retentionHold: true }, []), 'investigation-hold')
  assert.equal(retentionExclusion({ underInvestigation: true }, []), 'investigation-hold')
  assert.equal(retentionExclusion({ investigationStatus: 'OPEN' }, []), 'investigation-hold')
  assert.equal(retentionExclusion({}, []), '')
})

test('archives attendance and linked histories before deleting their sources', async () => {
  const sample = fakeFirestore()
  const result = await archiveAndDeleteAttendance({
    ...sample,
    policyRef: sample.policyRef,
    recordSnapshot: await sample.recordSnapshot(),
    runId: 'run-1',
    retentionDays: 365,
  })

  assert.deepEqual(result, { deleted: true, archived: true, approvalCount: 1, auditCount: 1 })
  assert.equal(sample.collections.get('attendance').has('attendance-1'), false)
  assert.equal(sample.collections.get('attendanceApprovalItems').has('approval-1'), false)
  assert.equal(sample.collections.get('attendanceConfigurationAudit').has('audit-1'), false)
  assert.equal(sample.collections.get('attendanceRetentionArchive').size, 1)
  const archive = [...sample.collections.get('attendanceRetentionArchive').values()][0]
  assert.equal(archive.content.attendance.id, 'attendance-1')
  assert.equal(archive.content.approvals[0].id, 'approval-1')
  assert.equal(archive.content.auditHistory[0].id, 'audit-1')
  assert.equal(hashValue(archive.content), archive.contentHash)
})

test('does not archive or delete records with pending approvals', async () => {
  const sample = fakeFirestore({ pending: true })
  const result = await archiveAndDeleteAttendance({
    ...sample,
    policyRef: sample.policyRef,
    recordSnapshot: await sample.recordSnapshot(),
    runId: 'run-1',
    retentionDays: 365,
  })

  assert.deepEqual(result, { deleted: false, reason: 'pending-approval' })
  assert.equal(sample.collections.get('attendance').has('attendance-1'), true)
  assert.equal(sample.collections.get('attendanceRetentionArchive').size, 0)
})

test('preserves source records when archive verification fails', async () => {
  const sample = fakeFirestore({ corruptArchive: true })
  await assert.rejects(
    archiveAndDeleteAttendance({
      ...sample,
      policyRef: sample.policyRef,
      recordSnapshot: await sample.recordSnapshot(),
      runId: 'run-1',
      retentionDays: 365,
    }),
    /Archive verification failed/,
  )

  assert.equal(sample.collections.get('attendance').has('attendance-1'), true)
  assert.equal(sample.collections.get('attendanceApprovalItems').has('approval-1'), true)
  assert.equal(sample.collections.get('attendanceConfigurationAudit').has('audit-1'), true)
})

test('retries safely after a transaction failure without duplicating the archive', async () => {
  const sample = fakeFirestore({ failTransactionOnce: true })
  const input = {
    ...sample,
    policyRef: sample.policyRef,
    recordSnapshot: await sample.recordSnapshot(),
    runId: 'run-1',
    retentionDays: 365,
  }
  await assert.rejects(archiveAndDeleteAttendance(input), /Transient transaction failure/)
  assert.equal(sample.collections.get('attendance').has('attendance-1'), true)
  assert.equal(sample.collections.get('attendanceRetentionArchive').size, 1)

  const retry = await archiveAndDeleteAttendance({
    ...sample,
    policyRef: sample.policyRef,
    recordSnapshot: await sample.recordSnapshot(),
    runId: 'run-2',
    retentionDays: 365,
  })
  assert.deepEqual(retry, { deleted: true, archived: false, approvalCount: 1, auditCount: 1 })
  assert.equal(sample.collections.get('attendance').has('attendance-1'), false)
  assert.equal(sample.collections.get('attendanceRetentionArchive').size, 1)
})

test('does not delete a source after the retention policy is paused', async () => {
  const sample = fakeFirestore({ pauseBeforeTransaction: true })
  await assert.rejects(
    archiveAndDeleteAttendance({
      ...sample,
      recordSnapshot: await sample.recordSnapshot(),
      runId: 'run-1',
      retentionDays: 365,
    }),
    /Retention policy was paused or changed/,
  )
  assert.equal(sample.collections.get('attendance').has('attendance-1'), true)
  assert.equal(sample.collections.get('attendanceRetentionArchive').size, 1)
})

test('preserves changed source records and safely retries using the verified archive', async () => {
  const sample = fakeFirestore({ mutateBeforeTransaction: true })
  const input = {
    ...sample,
    recordSnapshot: await sample.recordSnapshot(),
    runId: 'run-1',
    retentionDays: 365,
  }
  await assert.rejects(archiveAndDeleteAttendance(input), /Source attendance changed/)
  assert.equal(sample.collections.get('attendance').has('attendance-1'), true)
  assert.equal(sample.collections.get('attendanceRetentionArchive').size, 1)

  const retry = await archiveAndDeleteAttendance({
    ...sample,
    recordSnapshot: await sample.recordSnapshot(),
    runId: 'run-2',
    retentionDays: 365,
  })
  assert.deepEqual(retry, { deleted: true, archived: true, approvalCount: 1, auditCount: 1 })
  assert.equal(sample.collections.get('attendance').has('attendance-1'), false)
  assert.equal(sample.collections.get('attendanceRetentionArchive').size, 2)
})
