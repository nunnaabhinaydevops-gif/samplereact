import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { describeReadError } from '../lib/errors'
import { useAuth } from './useAuth'

export function useOwnEmployee() {
  const { profile } = useAuth()
  const employeeId = profile.employeeId || null
  const [state, setState] = useState({ id: null, employee: null, error: '' })

  useEffect(() => {
    if (!employeeId) return undefined
    return onSnapshot(
      doc(db, 'employees', employeeId),
      (snap) =>
        setState({
          id: employeeId,
          employee: snap.exists() ? { id: snap.id, ...snap.data() } : null,
          error: '',
        }),
      (err) => setState({ id: employeeId, employee: null, error: describeReadError(err) }),
    )
  }, [employeeId])

  if (!employeeId) return { status: 'unlinked' }
  if (state.id !== employeeId) return { status: 'loading' }
  if (state.error) return { status: 'error', error: state.error }
  if (!state.employee) return { status: 'missing' }
  return { status: 'ready', employee: state.employee }
}
