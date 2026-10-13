import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export function markNotificationRead(notificationId) {
  return updateDoc(doc(db, 'notifications', notificationId), { readAt: serverTimestamp() })
}
