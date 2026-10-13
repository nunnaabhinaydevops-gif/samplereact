import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from './firebase'
import atvLogo from './assets/atv-logo.webp'
import './App.css'

function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand">
          <div className="auth-logo-frame">
            <img src={atvLogo} alt="ATV Technologies logo" />
          </div>
        </aside>
        <section className="auth-panel">{children}</section>
      </div>
    </main>
  )
}

function App() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(undefined)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (user === undefined) {
    return null
  }

  if (user) {
    return (
      <AuthLayout>
        <div className="auth-panel-header">
          <h1>Welcome</h1>
        </div>
        <div className="auth-panel-body">
          <p className="auth-email">{user.email}</p>
          <button type="button" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </AuthLayout>
    )
  }

  const isSignup = mode === 'signup'

  return (
    <AuthLayout>
      <div className="auth-panel-header">
        <h1>{isSignup ? 'Create account' : 'Log in'}</h1>
        <p className="auth-subtitle">
          {isSignup
            ? 'Sign up with your email and a password.'
            : 'Welcome back! Enter your details to continue.'}
        </p>
      </div>
      <div className="auth-panel-body">
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {isSignup ? 'Sign up' : 'Log in'}
          </button>
        </form>
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(isSignup ? 'login' : 'signup')
            setError('')
          }}
        >
          {isSignup
            ? 'Already have an account? Log in'
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </AuthLayout>
  )
}

export default App
