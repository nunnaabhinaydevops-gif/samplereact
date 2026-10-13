import { Logo } from './Logo'

export default function StatusScreen({ title, message, onSignOut }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <Logo className="mx-auto h-14 w-auto" />
        <h1 className="mt-6 text-xl font-semibold text-slate-900">{title}</h1>
        {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  )
}
