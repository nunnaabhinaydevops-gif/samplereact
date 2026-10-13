import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [authReady, setAuthReady] = useState(false)
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [profileState, setProfileState] = useState({
    uid: null,
    status: 'loading',
    profile: null,
    error: '',
  })

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setFirebaseUser(user)
        setAuthReady(true)
      }),
    [],
  )

  useEffect(() => {
    if (!firebaseUser) return undefined
    const uid = firebaseUser.uid
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) {
          setProfileState({ uid, status: 'missing', profile: null, error: '' })
          return
        }
        const profile = { id: snap.id, ...snap.data() }
        setProfileState({
          uid,
          status: profile.active === false ? 'inactive' : 'ready',
          profile,
          error: '',
        })
      },
      (err) => {
        setProfileState({ uid, status: 'error', profile: null, error: err.message })
      },
    )
  }, [firebaseUser])

  const profileIsCurrent = firebaseUser && profileState.uid === firebaseUser.uid
  const current = profileIsCurrent
    ? profileState
    : { status: 'loading', profile: null, error: '' }

  return (
    <AuthContext.Provider
      value={{
        authReady,
        firebaseUser,
        profile: current.profile,
        profileStatus: current.status,
        profileError: current.error,
        signOut: () => firebaseSignOut(auth),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
