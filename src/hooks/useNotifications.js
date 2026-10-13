import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { describeReadError } from '../lib/errors'
import { useAuth } from './useAuth'

function createdAtMillis(item) {
  return item.createdAt?.toMillis?.() ?? 0
}

export function useNotifications() {
  const { firebaseUser } = useAuth()
  const uid = firebaseUser.uid
  const [state, setState] = useState({ uid: null, items: [], error: '' })

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', uid)),
        (snap) =>
          setState({
            uid,
            items: snap.docs
              .map((item) => ({ id: item.id, ...item.data() }))
              .sort((a, b) => createdAtMillis(b) - createdAtMillis(a)),
            error: '',
          }),
        (err) => setState({ uid, items: [], error: describeReadError(err) }),
      ),
    [uid],
  )

  const isCurrent = state.uid === uid
  const items = isCurrent ? state.items : []
  return {
    items,
    unreadCount: items.filter((item) => !item.readAt).length,
    loading: !isCurrent,
    error: isCurrent ? state.error : '',
  }
}
