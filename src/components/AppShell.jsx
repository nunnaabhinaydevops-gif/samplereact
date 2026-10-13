import { useState } from 'react'
import {
  Bell,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PartyPopper,
  PenSquare,
  Plane,
  ScrollText,
  Settings,
  Timer,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { COMPANY_NAME, TAGLINE } from '../lib/brand'
import GlobalSearch from './GlobalSearch'
import { Logo } from './Logo'
import NotificationsMenu from './NotificationsMenu'
import ProfileMenu from './ProfileMenu'

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

function SidebarContent({ modules, activeKey, collapsed, onSelect }) {
  return (
    <>
      <div className={`flex items-center gap-3 border-b border-white/10 px-4 py-4 ${collapsed ? 'justify-center' : ''}`}>
        <div className="shrink-0 rounded-lg bg-white p-1.5">
          <Logo className={collapsed ? 'h-7 w-auto' : 'h-9 w-auto'} />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{COMPANY_NAME}</p>
            <p className="truncate text-[11px] text-slate-400">{TAGLINE}</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {modules.map((module) => {
          const Icon = ICONS[module.key]
          const isActive = module.key === activeKey
          return (
            <button
              key={module.key}
              type="button"
              title={collapsed ? module.label : undefined}
              onClick={() => onSelect(module.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                isActive ? 'bg-white/10 font-medium text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              {!collapsed && <span className={`h-5 w-1 rounded-full ${isActive ? 'bg-innovate-500' : 'bg-transparent'}`} />}
              <Icon className="h-4 w-4 shrink-0" />
              <span className={collapsed ? 'sr-only' : 'truncate'}>{module.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}

function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-slate-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
            {isLast || !item.onClick ? (
              <span aria-current={isLast ? 'page' : undefined} className={`truncate ${isLast ? 'font-medium text-slate-900' : ''}`}>
                {item.label}
              </span>
            ) : (
              <button type="button" onClick={item.onClick} className="truncate hover:text-brand-700 hover:underline">
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default function AppShell({ modules, activeKey, onNavigate, breadcrumbs, searchEmployees, children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-brand-900 transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent modules={modules} activeKey={activeKey} collapsed={collapsed} onSelect={onNavigate} />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-900 transition-transform duration-200 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 rounded-lg p-1 text-slate-300 hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent
          modules={modules}
          activeKey={activeKey}
          collapsed={false}
          onSelect={(key) => {
            onNavigate(key)
            setMobileOpen(false)
          }}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:inline-flex"
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <GlobalSearch modules={modules} employees={searchEmployees} onNavigate={onNavigate} />
          <div className="ml-auto flex items-center gap-1">
            <NotificationsMenu />
            <ProfileMenu onNavigate={onNavigate} />
          </div>
        </header>
        <div className="border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
          <Breadcrumbs items={breadcrumbs} />
        </div>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
