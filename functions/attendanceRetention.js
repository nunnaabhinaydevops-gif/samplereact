const { createHash } = require('node:crypto')

function canonicalize(value) {
  if (value == null || typeof value !== 'object') return value
  if (typeof value.toMillis === 'function') return { timestampMillis: value.toMillis() }
  if (value instanceof Date) return { timestampMillis: value.getTime() }
  if (Buffer.isBuffer(value)) return { bytes: value.toString('base64') }
  if (Array.isArray(value)) return value.map(canonicalize)
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  )
}

function hashValue(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')
}

function retentionExclusion(record, approvalItems) {
  if (record.punchIn && !record.punchOut) return 'active-session'
  if (approvalItems.some((item) => typeof item.status === 'string' && item.status.toUpperCase() === 'PENDING')) {
    return 'pending-approval'
  }
  if (record.retentionHold === true ||
      record.underInvestigation === true ||
      (typeof record.investigationStatus === 'string' &&
        ['OPEN', 'PENDING', 'UNDER_INVESTIGATION'].includes(record.investigationStatus.toUpperCase()))) {
    return 'investigation-hold'
  }
  return ''
}

async function archiveAndDeleteAttendance({ db, FieldValue, policyRef, recordSnapshot, runId, retentionDays }) {
  const attendanceRef = recordSnapshot.ref
  const [freshRecord, approvalSnapshot, auditSnapshot] = await Promise.all([
    attendanceRef.get(),
    db.collection('attendanceApprovalItems').where('attendanceId', '==', recordSnapshot.id).get(),
    db.collection('attendanceConfigurationAudit').where('attendanceId', '==', recordSnapshot.id).get(),
  ])
  if (!freshRecord.exists) return { deleted: false, reason: 'already-removed' }
  const approvalDocs = approvalSnapshot.docs
  const auditDocs = auditSnapshot.docs
  const reason = retentionExclusion(freshRecord.data(), approvalDocs.map((item) => item.data()))
  if (reason) return { deleted: false, reason }
  if (approvalDocs.length + auditDocs.length + 1 > 450) {
    throw new Error('Record has too much linked history to safely remove in one transaction.')
  }

  const content = {
    attendance: { id: freshRecord.id, data: freshRecord.data() },
    approvals: approvalDocs.map((item) => ({ id: item.id, data: item.data() })),
    auditHistory: auditDocs.map((item) => ({ id: item.id, data: item.data() })),
  }
  const contentHash = hashValue(content)
  const archiveId = hashValue({ attendanceId: freshRecord.id, contentHash })
  const archiveRef = db.collection('attendanceRetentionArchive').doc(archiveId)
  const existingArchive = await archiveRef.get()
  let archiveCreated = false
  if (existingArchive.exists && existingArchive.get('contentHash') !== contentHash) {
    throw new Error('An existing archive entry does not match the source record; source was preserved.')
  }
  if (!existingArchive.exists) {
    await archiveRef.create({
      attendanceId: freshRecord.id,
      retentionRunId: runId,
      retentionDays,
      content,
      contentHash,
      archivedAt: FieldValue.serverTimestamp(),
    })
    archiveCreated = true
  }

  const verifiedArchive = await archiveRef.get()
  const archivedContent = verifiedArchive.get('content')
  if (!verifiedArchive.exists || verifiedArchive.get('contentHash') !== contentHash ||
      hashValue(archivedContent) !== contentHash ||
      archivedContent.attendance.id !== freshRecord.id ||
      archivedContent.approvals.length !== approvalDocs.length ||
      archivedContent.auditHistory.length !== auditDocs.length) {
    throw new Error('Archive verification failed; source and linked histories were preserved.')
  }

  try {
    await db.runTransaction(async (transaction) => {
      const currentPolicy = await transaction.get(policyRef)
      if (!currentPolicy.exists ||
          currentPolicy.get('retentionDays') !== retentionDays ||
          currentPolicy.get('retentionCleanupApproved') !== true) {
        throw new Error('Retention policy was paused or changed; source was preserved.')
      }
      const currentRecord = await transaction.get(attendanceRef)
      if (!currentRecord.exists || hashValue({
        attendance: { id: currentRecord.id, data: currentRecord.data() },
        approvals: approvalDocs.map((item) => ({ id: item.id, data: item.data() })),
        auditHistory: auditDocs.map((item) => ({ id: item.id, data: item.data() })),
      }) !== contentHash) {
        throw new Error('Source attendance changed after archiving; record was preserved for a later run.')
      }
      const approvalCurrent = await Promise.all(approvalDocs.map((item) => transaction.get(item.ref)))
      const auditCurrent = await Promise.all(auditDocs.map((item) => transaction.get(item.ref)))
      if (approvalCurrent.some((item, index) => !item.exists || hashValue(item.data()) !== hashValue(approvalDocs[index].data())) ||
          auditCurrent.some((item, index) => !item.exists || hashValue(item.data()) !== hashValue(auditDocs[index].data()))) {
        throw new Error('Linked approval or audit history changed after archiving; source was preserved.')
      }
      const currentReason = retentionExclusion(currentRecord.data(), approvalCurrent.map((item) => item.data()))
      if (currentReason) throw new Error(`Retention exclusion changed to ${currentReason}; source was preserved.`)
      transaction.delete(attendanceRef)
      for (const item of approvalDocs) transaction.delete(item.ref)
      for (const item of auditDocs) transaction.delete(item.ref)
    })
  } catch (error) {
    const failure = new Error(error instanceof Error ? error.message : String(error), { cause: error })
    failure.archiveCreated = archiveCreated
    throw failure
  }
  return { deleted: true, archived: archiveCreated, approvalCount: approvalDocs.length, auditCount: auditDocs.length }
}

module.exports = { canonicalize, hashValue, retentionExclusion, archiveAndDeleteAttendance }
