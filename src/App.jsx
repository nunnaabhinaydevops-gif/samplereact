import { useEffect, useRef, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  getMultiFactorResolver,
  onAuthStateChanged,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from './firebase'
import atvLogo from './assets/atv-logo.webp'
import Dashboard from './Dashboard.jsx'
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
  const [mfa, setMfa] = useState(null)
  const [code, setCode] = useState('')
  const recaptchaRef = useRef(null)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  async function sendSignInCode(resolver) {
    recaptchaRef.current?.clear()
    recaptchaRef.current = new RecaptchaVerifier(auth, 'mfa-recaptcha', { size: 'invisible' })
    return new PhoneAuthProvider(auth).verifyPhoneNumber(
      { multiFactorHint: resolver.hints[0], session: resolver.session },
      recaptchaRef.current,
    )
  }

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
      if (err.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, err)
        try {
          setMfa({ resolver, verificationId: await sendSignInCode(resolver) })
        } catch (codeError) {
          setError(codeError.message)
        }
      } else {
        setError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCodeSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const credential = PhoneAuthProvider.credential(mfa.verificationId, code)
      await mfa.resolver.resolveSignIn(PhoneMultiFactorGenerator.assertion(credential))
      setMfa(null)
      setCode('')
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function cancelCodeStep() {
    setMfa(null)
    setCode('')
    setError('')
  }

  if (user === undefined) {
    return null
  }

  if (user) {
    return <Dashboard user={user} />
  }

  const isSignup = mode === 'signup'

  if (mfa) {
    return (
      <AuthLayout>
        <div id="mfa-recaptcha" />
        <div className="auth-panel-header">
          <h1>Enter your code</h1>
          <p className="auth-subtitle">We sent a 6-digit code to {mfa.resolver.hints[0].phoneNumber}.</p>
        </div>
        <div className="auth-panel-body">
          <form onSubmit={handleCodeSubmit}>
            <label>
              Verification code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={submitting}>
              Verify and log in
            </button>
          </form>
          <button type="button" className="auth-switch" onClick={cancelCodeStep}>
            Back to log in
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div id="mfa-recaptcha" />
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
