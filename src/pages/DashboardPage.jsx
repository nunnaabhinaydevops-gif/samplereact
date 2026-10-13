import { useAuth } from '../hooks/useAuth'
import { TAGLINE } from '../lib/brand'
import { ROLE_LABELS, ROLES } from '../lib/roles'

const MANAGEMENT = [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.MANAGER]

function DashboardCard({ title, emptyText, accent = 'brand' }) {
  const accentClass = accent === 'innovate' ? 'bg-innovate-500' : 'bg-brand-500'
  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accentClass}`} />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="mt-4 flex flex-1 items-center justify-center rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        {emptyText}
      </p>
    </section>
  )
}

export default function DashboardPage() {
  const { profile, firebaseUser } = useAuth()
  const name = profile.displayName || firebaseUser.email
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const isManagement = MANAGEMENT.includes(profile.role)

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-2 rounded-2xl bg-gradient-to-r from-brand-900 via-brand-700 to-brand-500 p-6 text-white shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-white/80">{today}</p>
          <h2 className="mt-1 text-2xl font-semibold">Welcome, {name}</h2>
          <p className="mt-1 text-sm text-white/80">{ROLE_LABELS[profile.role]}</p>
        </div>
        <p className="text-sm font-medium tracking-wide text-innovate-100">{TAGLINE}</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <DashboardCard
          title="Today's attendance"
          emptyText="Punch in and out will appear here once the attendance module is connected."
        />
        <DashboardCard
          title="Leave balance"
          emptyText="Leave balances will appear here once leave management is connected."
          accent="innovate"
        />
        <DashboardCard
          title="Upcoming holidays"
          emptyText="Company holidays will appear here once the holiday calendar is configured."
          accent="innovate"
        />
        {isManagement && (
          <DashboardCard
            title="Pending approvals"
            emptyText="Leave and regularization requests awaiting your approval will appear here."
          />
        )}
        <DashboardCard
          title="Notifications"
          emptyText="You have no notifications yet."
          accent="innovate"
        />
      </div>
    </div>
  )
}
