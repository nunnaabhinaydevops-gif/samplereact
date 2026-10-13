import { useState } from 'react'
import {
  Bell,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  MapPin,
  PartyPopper,
  PenSquare,
  Plane,
  ScrollText,
  Settings,
  Timer,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { COMPANY_NAME, TAGLINE } from '../lib/brand'
import { ROLE_LABELS } from '../lib/roles'
import { Logo } from './Logo'

const ICONS = {
  dashboard: LayoutDashboard,
  employees: Users,
  attendance: CalendarCheck,
  'attendance-calendar': CalendarDays,
  regularization: PenSquare,
  leave: Plane,
  shifts: Timer,
  holidays: PartyPopper,
  locations: MapPin,
  reports: BarChart3,
  payroll: Wallet,
  notifications: Bell,
  'audit-logs': ScrollText,
  settings: Settings,
}

function initials(name) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export default function AppShell({ modules, activeKey, onSelect, children }) {
  const { profile, firebaseUser, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = profile.displayName || firebaseUser.email
  const activeModule = modules.find((module) => module.key === activeKey)

  function select(key) {
    onSelect(key)
    setMenuOpen(false)
  }

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="rounded-lg bg-white p-1.5">
          <Logo className="h-9 w-auto" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">{COMPANY_NAME}</p>
          <p className="text-[11px] text-slate-400">{TAGLINE}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {modules.map((module) => {
          const Icon = ICONS[module.key]
          const isActive = module.key === activeKey
          return (
            <button
              key={module.key}
              type="button"
              onClick={() => select(module.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                isActive
                  ? 'bg-white/10 font-medium text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span
                className={`h-5 w-1 rounded-full ${isActive ? 'bg-innovate-500' : 'bg-transparent'}`}
              />
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{module.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-900 lg:flex">
        {sidebarContent}
      </aside>

      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-900 transition-transform lg:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">
            {activeModule?.label}
          </h1>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[profile.role]}</p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {initials(displayName)}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
