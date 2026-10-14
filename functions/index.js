const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')
const { getStorage } = require('firebase-admin/storage')

const app = initializeApp()
const db = getFirestore(app, 'hrms-attendance')

const HR_ROLES = ['SUPER_ADMIN', 'HR']
const IST_OFFSET_MS = 330 * 60 * 1000
const MAX_OFFER_BYTES = 3 * 1024 * 1024
const CORRECTION_STATUSES = ['present', 'leave', 'absent']
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/

// Keep in sync with OFFER_TEMPLATES in src/me/constants.js
const OFFER_TEMPLATES = {
  'full-time-standard': 'Full-time',
  'full-time-senior': 'Full-time',
  contract: 'Contract',
  internship: 'Intern',
}

function requireSignedIn(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.')
  return request.auth.uid
}

async function requireHr(request) {
  const uid = requireSignedIn(request)
  const caller = await db.doc(`users/${uid}`).get()
  if (!caller.exists || !HR_ROLES.includes(caller.get('role'))) {
    throw new HttpsError('permission-denied', 'Only HR users can do this.')
  }
  return uid
}

function invalid(message) {
  return new HttpsError('invalid-argument', message)
}

function istDateKey(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

function istMinuteOfDay(date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  return ist.getUTCHours() * 60 + ist.getUTCMinutes()
}

function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function parseTimeOfDay(value) {
  const match = typeof value === 'string' ? TIME_OF_DAY.exec(value) : null
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

async function loadPolicy() {
  const snap = await db.doc('hrmsSettings/attendance').get()
  if (!snap.exists) {
    throw new HttpsError('failed-precondition', 'Attendance policy is not configured yet. Ask HR to set it up.')
  }
  const data = snap.data()
  const shiftStart = parseTimeOfDay(data.shiftStart)
  const shiftEnd = parseTimeOfDay(data.shiftEnd)
  const graceMinutes = data.graceMinutes
  if (shiftStart === null || shiftEnd === null || shiftEnd === shiftStart) {
    throw new HttpsError('failed-precondition', 'Attendance policy has an invalid shift time.')
  }
  if (!Number.isInteger(graceMinutes) || graceMinutes < 0) {
    throw new HttpsError('failed-precondition', 'Attendance policy has an invalid grace period.')
  }
  return {
    shiftStart,
    shiftEnd,
    graceMinutes,
    overnight: shiftEnd < shiftStart,
    weeklyOffs: Array.isArray(data.weeklyOffs) ? data.weeklyOffs : [],
    holidays: new Set(Array.isArray(data.holidays) ? data.holidays.map((holiday) => holiday.date) : []),
  }
}

function isScheduledWorkday(dateKey, policy) {
  const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay()
  return !policy.weeklyOffs.includes(weekday) && !policy.holidays.has(dateKey)
}

function latenessFor(punchIn, policy) {
  const lateBy = istMinuteOfDay(punchIn) - policy.shiftStart
  const isLate = lateBy > policy.graceMinutes
  return { isLate, lateMinutes: isLate ? lateBy : 0 }
}

function attendanceRef(uid, dateKey) {
  return db.doc(`attendance/${uid}_${dateKey}`)
}

function isOpenSession(data) {
  return Boolean(data?.punchIn) && !data?.punchOut
}

function parseOptionalTime(value, label) {
  if (value === null || value === undefined || value === '') return null
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) throw invalid(`Enter a valid ${label} time.`)
  return date
}

exports.punchIn = onCall(async (request) => {
  const uid = requireSignedIn(request)
  const workLocation = request.data?.workLocation ?? 'OFFICE'
  if (!['OFFICE', 'REMOTE'].includes(workLocation)) throw invalid('Choose Office or Remote as your work location.')
  const policy = await loadPolicy()
  const now = new Date()
  const today = istDateKey(now)
  const yesterday = shiftDateKey(today, -1)
  const todayRef = attendanceRef(uid, today)
  const yesterdayRef = attendanceRef(uid, yesterday)
  const { isLate, lateMinutes } = latenessFor(now, policy)

  await db.runTransaction(async (tx) => {
    const [todaySnap, yesterdaySnap] = await Promise.all([tx.get(todayRef), tx.get(yesterdayRef)])
    const todayData = todaySnap.data()

    if (policy.overnight && isOpenSession(yesterdaySnap.data()) && istMinuteOfDay(now) < policy.shiftEnd) {
      throw new HttpsError('failed-precondition', 'You are still punched in from your overnight shift. Punch out first.')
    }
    if (todayData?.punchIn) throw new HttpsError('already-exists', 'You have already punched in today.')
    if (todayData && ['leave', 'absent'].includes(todayData.status)) {
      throw new HttpsError('failed-precondition', `HR has marked today as ${todayData.status}.`)
    }
    if (!isScheduledWorkday(today, policy)) {
      throw new HttpsError('failed-precondition', 'Today is not a scheduled workday.')
    }

    tx.set(todayRef, {
      uid,
      date: today,
      status: 'present',
      workLocation,
      punchIn: Timestamp.fromDate(now),
      punchOut: null,
      isLate,
      lateMinutes,
      workedMinutes: null,
      correction: null,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  return { date: today, punchIn: now.toISOString(), isLate }
})

exports.punchOut = onCall(async (request) => {
  const uid = requireSignedIn(request)
  const now = new Date()
  const today = istDateKey(now)
  const refs = [attendanceRef(uid, today), attendanceRef(uid, shiftDateKey(today, -1))]

  return db.runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)))
    const openSnap = snaps.find((snap) => isOpenSession(snap.data()))
    if (!openSnap) throw new HttpsError('failed-precondition', 'You are not punched in right now.')

    const data = openSnap.data()
    const punchIn = data.punchIn.toDate()
    if (now.getTime() <= punchIn.getTime()) {
      throw new HttpsError('failed-precondition', 'Punch-out time must be after punch-in.')
    }

    const workedMinutes = Math.floor((now.getTime() - punchIn.getTime()) / 60000)
    tx.update(openSnap.ref, {
      punchOut: Timestamp.fromDate(now),
      workedMinutes,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { date: data.date, punchOut: now.toISOString(), workedMinutes }
  })
})

exports.correctAttendance = onCall(async (request) => {
  const hrUid = await requireHr(request)
  const { employeeUid, date, status, punchIn, punchOut, reason } = request.data ?? {}

  if (typeof employeeUid !== 'string' || !employeeUid) throw invalid('Choose an employee.')
  if (employeeUid === hrUid) throw new HttpsError('permission-denied', 'HR users cannot correct their own attendance.')
  if (typeof date !== 'string' || !DATE_KEY.test(date)) throw invalid('Choose a valid date.')
  if (!CORRECTION_STATUSES.includes(status)) throw invalid('Choose a valid status.')
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 300) {
    throw invalid('Give a reason between 5 and 300 characters.')
  }

  const inTime = parseOptionalTime(punchIn, 'punch-in')
  const outTime = parseOptionalTime(punchOut, 'punch-out')
  if (status === 'present' && !inTime) throw invalid('Punch-in time is required for a present day.')
  if (status !== 'present' && (inTime || outTime)) throw invalid('Leave and absent days cannot have punch times.')
  if (inTime && outTime && outTime.getTime() <= inTime.getTime()) {
    throw invalid('Punch-out must be after punch-in.')
  }

  const target = await db.doc(`users/${employeeUid}`).get()
  if (!target.exists) throw new HttpsError('not-found', 'Employee not found.')

  const policy = await loadPolicy()
  const late =
    inTime && istDateKey(inTime) === date ? latenessFor(inTime, policy) : { isLate: false, lateMinutes: 0 }

  await attendanceRef(employeeUid, date).set(
    {
      uid: employeeUid,
      date,
      status,
      punchIn: inTime ? Timestamp.fromDate(inTime) : null,
      punchOut: outTime ? Timestamp.fromDate(outTime) : null,
      isLate: late.isLate,
      lateMinutes: late.lateMinutes,
      workedMinutes: inTime && outTime ? Math.floor((outTime.getTime() - inTime.getTime()) / 60000) : null,
      correction: { by: hrUid, reason: reason.trim(), at: Timestamp.now() },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  return { employeeUid, date, status }
})

exports.uploadOfferLetter = onCall(async (request) => {
  const hrUid = await requireHr(request)
  const { employeeUid, templateKey, designation, joiningDate, fileName, contentBase64 } = request.data ?? {}

  if (typeof employeeUid !== 'string' || !employeeUid) throw invalid('Choose an employee.')
  if (!Object.hasOwn(OFFER_TEMPLATES, templateKey)) throw invalid('Choose a valid offer template.')
  if (typeof designation !== 'string' || designation.trim().length < 2 || designation.trim().length > 80) {
    throw invalid('Designation must be between 2 and 80 characters.')
  }
  if (typeof joiningDate !== 'string' || !DATE_KEY.test(joiningDate)) throw invalid('Choose a valid joining date.')
  if (typeof contentBase64 !== 'string' || !contentBase64) throw invalid('Attach a PDF file.')

  const buffer = Buffer.from(contentBase64, 'base64')
  if (buffer.length === 0 || buffer.length > MAX_OFFER_BYTES) throw invalid('PDF must be 3 MB or smaller.')
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') throw invalid('The file is not a valid PDF.')

  const target = await db.doc(`users/${employeeUid}`).get()
  if (!target.exists) throw new HttpsError('not-found', 'Employee not found.')
  const employmentType = target.get('employmentType')
  if (employmentType !== OFFER_TEMPLATES[templateKey]) {
    throw new HttpsError(
      'failed-precondition',
      `This template is for ${OFFER_TEMPLATES[templateKey]} employees, but this employee is ${employmentType || 'not set'}.`,
    )
  }

  const docRef = db.collection('employeeDocuments').doc()
  const storagePath = `offer-letters/${employeeUid}/${docRef.id}.pdf`
  await getStorage(app)
    .bucket()
    .file(storagePath)
    .save(buffer, {
      contentType: 'application/pdf',
      resumable: false,
      metadata: { cacheControl: 'private, no-store' },
    })

  await docRef.set({
    employeeUid,
    type: 'offer_letter',
    templateKey,
    employmentType,
    designation: designation.trim(),
    joiningDate,
    fileName: String(fileName ?? 'offer-letter.pdf').replace(/[^\w.-]/g, '_').slice(0, 120),
    storagePath,
    status: 'draft',
    uploadedBy: hrUid,
    uploadedAt: FieldValue.serverTimestamp(),
    approvedBy: null,
    approvedAt: null,
  })

  return { id: docRef.id, status: 'draft' }
})

exports.approveOfferLetter = onCall(async (request) => {
  const hrUid = await requireHr(request)
  const documentId = request.data?.documentId
  if (typeof documentId !== 'string' || !documentId) throw invalid('Choose a document to approve.')

  const docRef = db.collection('employeeDocuments').doc(documentId)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef)
    if (!snap.exists) throw new HttpsError('not-found', 'Document not found.')

    const data = snap.data()
    if (data.status !== 'draft') throw new HttpsError('failed-precondition', 'Only drafts can be approved.')
    if (data.uploadedBy === hrUid) {
      throw new HttpsError('permission-denied', 'A different HR user must review and approve this offer letter.')
    }

    const priorSnap = await tx.get(
      db
        .collection('employeeDocuments')
        .where('employeeUid', '==', data.employeeUid)
        .where('status', '==', 'approved'),
    )
    priorSnap.docs.forEach((prior) => {
      tx.update(prior.ref, { status: 'superseded', supersededAt: FieldValue.serverTimestamp() })
    })
    tx.update(docRef, { status: 'approved', approvedBy: hrUid, approvedAt: FieldValue.serverTimestamp() })
  })

  return { id: documentId, status: 'approved' }
})

exports.getOfferLetter = onCall(async (request) => {
  const uid = requireSignedIn(request)
  const documentId = request.data?.documentId
  if (typeof documentId !== 'string' || !documentId) throw invalid('Choose a document.')

  const snap = await db.collection('employeeDocuments').doc(documentId).get()
  const data = snap.data()
  const callerRole = (await db.doc(`users/${uid}`).get()).get('role')
  const allowed =
    HR_ROLES.includes(callerRole) || (data && data.employeeUid === uid && data.status === 'approved')
  if (!snap.exists || !allowed) throw new HttpsError('not-found', 'Document not found.')

  const [contents] = await getStorage(app).bucket().file(data.storagePath).download()
  return { fileName: data.fileName, contentBase64: contents.toString('base64') }
})
