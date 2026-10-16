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

function useOwnedRecords(collectionName, uid, compare) {
  const [state, setState] = useState({ status: 'loading', records: [], error: '' })

  useEffect(() => {
    if (!uid) return undefined
    return onSnapshot(
      query(collection(db, collectionName), where('uid', '==', uid)),
      (snap) => {
        const records = snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort(compare)
        setState({ status: 'ready', records, error: '' })
      },
      (error) => setState({ status: 'error', records: [], error: error.message }),
    )
  }, [collectionName, uid, compare])

  return state
}

function useDocumentById(collectionName, id) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })

  useEffect(() => {
    if (!id) return undefined
    return onSnapshot(
      doc(db, collectionName, id),
      (snap) =>
        setState(
          snap.exists()
            ? { status: 'ready', data: snap.data(), error: '' }
            : { status: 'missing', data: null, error: '' },
        ),
      (error) => setState({ status: 'error', data: null, error: error.message }),
    )
  }, [collectionName, id])

  return state
}

const byDisbursedOnDesc = (a, b) => (b.disbursedOn ?? '').localeCompare(a.disbursedOn ?? '')
const byCreatedAtDesc = (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)

export function useTaxSummary(uid, financialYear) {
  return useDocumentById('taxSummaries', uid ? `${uid}_${financialYear}` : null)
}

export function useTaxDeclaration(uid, financialYear) {
  return useDocumentById('taxDeclarations', uid ? `${uid}_${financialYear}` : null)
}

export function useLoans(uid) {
  return useOwnedRecords('loans', uid, byDisbursedOnDesc)
}

export function useLoanRequests(uid) {
  return useOwnedRecords('loanRequests', uid, byCreatedAtDesc)
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
