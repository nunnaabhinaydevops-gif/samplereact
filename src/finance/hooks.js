import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'

export function usePayrollRecords(uid) {
  const [state, setState] = useState({ status: 'loading', records: [], error: '' })

  useEffect(() => {
    if (!uid) return undefined
    return onSnapshot(
      query(collection(db, 'payrollRecords'), where('uid', '==', uid)),
      (snap) => {
        const records = snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => (b.periodEnd ?? '').localeCompare(a.periodEnd ?? ''))
        setState({ status: 'ready', records, error: '' })
      },
      (error) => setState({ status: 'error', records: [], error: error.message }),
    )
  }, [uid])

  return state
}

export function useBankDetails(uid) {
  const [state, setState] = useState({ status: 'loading', details: null, error: '' })

  useEffect(() => {
    if (!uid) return undefined
    return onSnapshot(
      doc(db, 'bankDetails', uid),
      (snap) =>
        setState(
          snap.exists()
            ? { status: 'ready', details: snap.data(), error: '' }
            : { status: 'missing', details: null, error: '' },
        ),
      (error) => setState({ status: 'error', details: null, error: error.message }),
    )
  }, [uid])

  return state
}
