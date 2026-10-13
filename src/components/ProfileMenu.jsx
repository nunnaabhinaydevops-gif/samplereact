import { useRef, useState } from 'react'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useOutsideClick } from '../hooks/useOutsideClick'
import { initials } from '../lib/format'
import { ROLE_LABELS } from '../lib/roles'
import { Logo } from './Logo'

export default function ProfileMenu({ onNavigate }) {
  const { profile, firebaseUser, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false), open)

  const name = profile.displayName || firebaseUser.email
  const hasProfileLink = Boolean(profile.employeeId)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile menu"
        className="flex items-center rounded-full p-0.5 hover:bg-slate-100"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {initials(name)}
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex items-center gap-3 px-3 py-2">
            <Logo className="h-7 w-auto" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
              <p className="truncate text-xs text-slate-500">{firebaseUser.email}</p>
              <span className="mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                {ROLE_LABELS[profile.role]}
              </span>
            </div>
          </div>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            disabled={!hasProfileLink}
            onClick={() => {
              setOpen(false)
              onNavigate('my-profile')
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            <User className="h-4 w-4" />
            {hasProfileLink ? 'My profile' : 'My profile (not linked yet)'}
          </button>
          <button type="button" role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
