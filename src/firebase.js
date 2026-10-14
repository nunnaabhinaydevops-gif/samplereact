import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyArHvfo1j-hP-1W2N2JtkBY_63KTRh0uKk',
  authDomain: 'abhinay-89a72.firebaseapp.com',
  projectId: 'abhinay-89a72',
  storageBucket: 'abhinay-89a72.firebasestorage.app',
  messagingSenderId: '173011791248',
  appId: '1:173011791248:web:f3abb0a68adf260521d715',
  measurementId: 'G-NR4K7X573V',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const analytics = getAnalytics(app)
export const db = getFirestore(app, 'hrms-attendance')
export const storage = getStorage(app)
export const functions = getFunctions(app)
