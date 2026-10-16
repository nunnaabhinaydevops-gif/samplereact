import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { getBytes, ref } from 'firebase/storage'
import { db, storage } from '../firebase'

function toProfile(snap) {
  return { id: snap.id, ...snap.data() }
}

function toAttendanceRecord(snap) {
  const data = snap.data()
  return {
    id: snap.id,
    date: data.date,
    status: data.status ?? 'present',
    workLocation: data.workLocation ?? 'OFFICE',
    punchIn: data.punchIn?.toDate() ?? null,
    punchOut: data.punchOut?.toDate() ?? null,
    isLate: Boolean(data.isLate),
    workedMinutes: data.workedMinutes ?? null,
    correctionReason: data.correction?.reason ?? null,
  }
}

function toEmployeeDocument(snap) {
  const data = snap.data()
  return {
    id: snap.id,
    employeeUid: data.employeeUid,
    templateKey: data.templateKey,
    employmentType: data.employmentType,
    designation: data.designation,
    joiningDate: data.joiningDate,
    fileName: data.fileName,
    status: data.status,
    uploadedBy: data.uploadedBy,
    uploadedAt: data.uploadedAt?.toDate() ?? null,
    approvedAt: data.approvedAt?.toDate() ?? null,
  }
}

export function useNow() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return now
}

export function useUserProfile(uid) {
  const [state, setState] = useState({ status: 'loading', profile: null, error: '' })

  useEffect(() => {
    if (!uid) return undefined
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) =>
        setState(
          snap.exists()
            ? { status: 'ready', profile: toProfile(snap), error: '' }
            : { status: 'missing', profile: null, error: '' },
        ),
      (error) => setState({ status: 'error', profile: null, error: error.message }),
    )
  }, [uid])

  return state
}

export function useDirectory(enabled, collectionId = 'users') {
  const [state, setState] = useState({ status: 'loading', items: [], error: '' })

  useEffect(() => {
    if (!enabled) return undefined
    return onSnapshot(
      collection(db, collectionId),
      (snap) => setState({ status: 'ready', items: snap.docs.map(toProfile), error: '' }),
      (error) => setState({ status: 'error', items: [], error: error.message }),
    )
  }, [enabled, collectionId])

  return state
}

export function useSettingsDoc(settingId) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'hrmsSettings', settingId),
        (snap) =>
          setState(
            snap.exists()
              ? { status: 'ready', data: snap.data(), error: '' }
              : { status: 'missing', data: null, error: '' },
          ),
        (error) => setState({ status: 'error', data: null, error: error.message }),
      ),
    [settingId],
  )

  return state
}

export function useAttendanceRange(uid, fromKey, toKey) {
  const [state, setState] = useState({ status: 'loading', records: [], error: '' })

  useEffect(() => {
    if (!uid) return undefined
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('uid', '==', uid),
      where('date', '>=', fromKey),
      where('date', '<=', toKey),
    )
    return onSnapshot(
      attendanceQuery,
      (snap) => setState({ status: 'ready', records: snap.docs.map(toAttendanceRecord), error: '' }),
      (error) => setState({ status: 'error', records: [], error: error.message }),
    )
  }, [uid, fromKey, toKey])

  return state
}

function toLeaveRequest(snap) {
  const data = snap.data()
  return {
    id: snap.id,
    type: data.type,
    from: data.from,
    to: data.to,
    days: data.days,
    reason: data.reason ?? '',
    status: data.status,
  }
}

export function useLeaveRequests(uid) {
  const [state, setState] = useState({ status: 'loading', requests: [], error: '' })

  useEffect(() => {
    if (!uid) return undefined
    return onSnapshot(
      query(collection(db, 'leaveRequests'), where('uid', '==', uid)),
      (snap) => setState({ status: 'ready', requests: snap.docs.map(toLeaveRequest), error: '' }),
      (error) => setState({ status: 'error', requests: [], error: error.message }),
    )
  }, [uid])

  return state
}

export function useEmployeeDocuments(employeeUid, approvedOnly) {
  const [state, setState] = useState({ status: 'loading', items: [], error: '' })

  useEffect(() => {
    if (!employeeUid) return undefined
    const constraints = [where('employeeUid', '==', employeeUid)]
    if (approvedOnly) constraints.push(where('status', '==', 'approved'))
    return onSnapshot(
      query(collection(db, 'employeeDocuments'), ...constraints),
      (snap) => setState({ status: 'ready', items: snap.docs.map(toEmployeeDocument), error: '' }),
      (error) => setState({ status: 'error', items: [], error: error.message }),
    )
  }, [employeeUid, approvedOnly])

  return state
}

export function usePhotoUrl(photoPath) {
  const [entry, setEntry] = useState({ path: null, url: null })

  useEffect(() => {
    if (!photoPath) return undefined
    let active = true
    let objectUrl = null

    getBytes(ref(storage, photoPath))
      .then((bytes) => {
        if (!active) return
        objectUrl = URL.createObjectURL(new Blob([bytes]))
        setEntry({ path: photoPath, url: objectUrl })
      })
      .catch(() => {
        if (active) setEntry({ path: photoPath, url: null })
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoPath])

  return entry.path === photoPath ? entry.url : null
}
