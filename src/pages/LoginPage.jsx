import { useState } from 'react'
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { Logo } from '../components/Logo'
import { auth } from '../firebase'
import { COMPANY_NAME, TAGLINE } from '../lib/brand'

const ERROR_MESSAGES = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact HR.',
  'auth/too-many-requests': 'Too many attempts. Try again later or reset your password.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
}

function describeError(err) {
  return ERROR_MESSAGES[err?.code] ?? 'Something went wrong. Please try again.'
}

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isReset = mode === 'reset'

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setNotice('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)
    try {
      if (isReset) {
        await sendPasswordResetEmail(auth, email)
        setNotice('If an account exists for this email, a password reset link has been sent.')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        setPassword('')
      }
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <section className="flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-8 text-center text-white lg:w-1/2 lg:p-12">
        <div className="rounded-2xl bg-white p-4 shadow-lg">
          <Logo className="h-24 w-auto lg:h-32" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold lg:text-3xl">{COMPANY_NAME}</h1>
        <p className="mt-2 text-sm tracking-wide text-white/80">{TAGLINE}</p>
        <p className="mt-6 hidden max-w-sm text-sm text-white/70 lg:block">
          Attendance, leave, and people management for your whole team, in one place.
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            {isReset ? 'Reset your password' : 'Sign in to HRMS'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isReset
              ? 'Enter your work email and we will send you a reset link.'
              : 'Use the email and password issued by your HR team.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Work email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            {!isReset && (
              <label className="block text-sm font-medium text-slate-700">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-lg bg-innovate-100 px-3 py-2 text-sm text-innovate-600">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-700 px-4 py-2.5 font-medium text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? 'Please wait…'
                : isReset
                  ? 'Send reset link'
                  : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            {isReset ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-medium text-brand-700 hover:underline"
              >
                Back to sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="font-medium text-brand-700 hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
