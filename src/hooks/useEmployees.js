import { useEffect, useState } from 'react'
import { describeReadError } from '../lib/errors'
import { canViewDirectory } from '../lib/roles'
import { subscribeToEmployees } from '../services/employees'
import { useAuth } from './useAuth'

export function useEmployees() {
  const { profile, firebaseUser } = useAuth()
  const role = profile.role
  const uid = firebaseUser.uid
  const enabled = canViewDirectory(role)
  const key = enabled ? `${role}:${uid}` : null
  const [state, setState] = useState({ key: null, employees: [], error: '' })

  useEffect(() => {
    if (!enabled) return undefined
    const subscriptionKey = `${role}:${uid}`
    return subscribeToEmployees(
      { role, uid },
      (employees) => setState({ key: subscriptionKey, employees, error: '' }),
      (err) => setState({ key: subscriptionKey, employees: [], error: describeReadError(err) }),
    )
  }, [enabled, role, uid])

  if (!enabled) return { status: 'unavailable', employees: [], error: '' }
  if (state.key !== key) return { status: 'loading', employees: [], error: '' }
  if (state.error) return { status: 'error', employees: [], error: state.error }
  return { status: 'ready', employees: state.employees, error: '' }
}
