import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import atvLogo from './assets/atv-logo.webp'
import AttendanceSection from './hrms/AttendanceSection.jsx'
import EmployeeSection from './hrms/EmployeeSection.jsx'
import LeaveSection from './hrms/LeaveSection.jsx'
import PayrollSection from './hrms/PayrollSection.jsx'
import PerformanceSection from './hrms/PerformanceSection.jsx'
import RecruitmentSection from './hrms/RecruitmentSection.jsx'
import './Dashboard.css'
import './hrms/hrms.css'

const navItems = [
  { label: 'Home', icon: 'home', active: true },
  { label: 'Me', icon: 'user' },
  { label: 'Inbox', icon: 'inbox', badge: 3 },
  { label: 'Team', icon: 'team' },
  { label: 'Finances', icon: 'wallet' },
  { label: 'Organisation', icon: 'building' },
]

const recentActions = ['Apply Leave', 'Add an Expense', 'View Pay Slips', 'Refer a Candidate']

const stats = [
  { label: 'Pending tasks', value: '02', tone: 'blue' },
  { label: 'Rejected expenses', value: '01', tone: 'red' },
  { label: 'Approved leave', value: '01', tone: 'green' },
  { label: 'Pending reviews', value: '04', tone: 'amber' },
]

const peers = [
  { initials: 'PS', name: 'Priya Sharma', role: 'Frontend Engineer', location: 'Hyderabad' },
  { initials: 'DL', name: 'Daniel Lee', role: 'Product Designer', location: 'Bengaluru' },
  { initials: 'MP', name: 'Meera Patel', role: 'QA Analyst', location: 'Pune' },
]

const posts = [
  {
    id: 1,
    scope: 'Organisation',
    from: 'Ramesh',
    to: 'Victor',
    initials: 'RM',
    ago: '2 hours ago',
    tag: 'Above & Beyond',
    message: 'Thank you, Victor, for your great help in solving my queries.',
    likes: 6,
    comments: 0,
  },
  {
    id: 2,
    scope: 'Organisation',
    from: 'Rahul',
    to: 'Koushik',
    initials: 'RS',
    ago: '7 hours ago',
    tag: 'Team Player',
    message: 'Thanks for walking me through the release checklist yesterday.',
    likes: 19,
    comments: 2,
  },
  {
    id: 3,
    scope: 'Marketing',
    from: 'Aisha',
    to: 'Kiran',
    initials: 'AK',
    ago: 'Yesterday',
    tag: 'Creative Spark',
    message: 'Loved the campaign concepts you shared this morning.',
    likes: 4,
    comments: 1,
  },
]

const ICONS = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5h13L22 12v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-7z" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c2 .6 3.5 2.2 3.5 5.2" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M16 13h2M3 10h18" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-3h4v3" />
    </>
  ),
  action: (
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17h.01" />
    </>
  ),
}

function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

function useNow() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return now
}

export default function Dashboard({ user }) {
  const now = useNow()
  const [scope, setScope] = useState('Organisation')
  const name = user.displayName || user.email.split('@')[0]
  const initial = name.charAt(0).toUpperCase()
  const visiblePosts = posts.filter((post) => post.scope === scope)

  return (
    <div className="dash">
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <img src={atvLogo} alt="ATV Technologies" />
        </div>
        <nav className="dash-nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`dash-nav-item${item.active ? ' is-active' : ''}`}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.badge && <span className="dash-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="dash-recent">
          <p className="dash-section-title">Recent actions</p>
          {recentActions.map((action) => (
            <button key={action} type="button" className="dash-nav-item">
              <Icon name="action" />
              {action}
            </button>
          ))}
        </div>
        <div className="dash-sidebar-foot">
          <button type="button" className="dash-nav-item">
            <Icon name="help" />
            FAQs
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <label className="dash-search">
            <Icon name="search" />
            <input type="search" placeholder="Search employees, actions" />
          </label>
          <div className="dash-topbar-actions">
            <button type="button" className="dash-icon-btn" aria-label="Notifications">
              <Icon name="bell" />
            </button>
            <div className="dash-avatar" title={user.email}>
              {initial}
            </div>
            <button
              type="button"
              className="dash-signout"
              onClick={() => signOut(auth)}
            >
              <Icon name="logout" />
              Sign out
            </button>
          </div>
        </header>

        <main className="dash-content">
          <section className="dash-banner">
            <p className="dash-banner-eyebrow">ATV Technologies</p>
            <h3>Build. Innovate. Transform.</h3>
            <p>Manage leave, expenses and your team from one place.</p>
          </section>

          <div className="dash-greeting">
            <h2>
              Welcome back, <span>{name}</span>
            </h2>
            <p>
              {now.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="dash-stats">
            {stats.map((stat) => (
              <div key={stat.label} className={`dash-stat dash-stat-${stat.tone}`}>
                <span className="dash-stat-value">{stat.value}</span>
                <span className="dash-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="dash-columns">
            <div className="dash-stack">
              <section className="dash-card">
                <h4 className="dash-card-title">Holidays</h4>
                <p className="dash-holiday-name">Team Offsite Day</p>
                <p>Friday, Mar 10</p>
              </section>

              <section className="dash-card">
                <h4 className="dash-card-title">Time today</h4>
                <p className="dash-clock">
                  {now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </section>

              <section className="dash-card">
                <h4 className="dash-card-title">Peers</h4>
                {peers.map((peer) => (
                  <div key={peer.name} className="dash-peer">
                    <div className="dash-peer-avatar">{peer.initials}</div>
                    <div>
                      <p className="dash-peer-name">{peer.name}</p>
                      <p className="dash-peer-meta">{peer.role}</p>
                      <p className="dash-peer-meta">{peer.location}</p>
                    </div>
                  </div>
                ))}
              </section>
            </div>

            <div className="dash-stack">
              <section className="dash-card">
                <div className="dash-scope-row">
                  <span className="dash-card-title">Post to</span>
                  <Scope scope={scope} onChange={setScope} />
                </div>
                <textarea placeholder="Write your post here..." rows={3} />
              </section>

              <section className="dash-card">
                <div className="dash-scope-row">
                  <h4 className="dash-card-title">Newsfeed</h4>
                  <Scope scope={scope} onChange={setScope} />
                </div>
                {visiblePosts.length === 0 && (
                  <p className="dash-empty">No posts in {scope} yet.</p>
                )}
                {visiblePosts.map((post) => (
                  <article key={post.id} className="dash-post">
                    <div className="dash-post-avatar">{post.initials}</div>
                    <div className="dash-post-body-wrap">
                      <p className="dash-post-meta">
                        <strong>{post.from}</strong> praised <strong>{post.to}</strong> · {post.ago}
                      </p>
                      <div className="dash-post-body">
                        <span className="dash-tag">{post.tag}</span>
                        <p>{post.message}</p>
                      </div>
                      <p className="dash-post-meta">
                        {post.likes} likes · {post.comments} comments
                      </p>
                    </div>
                  </article>
                ))}
              </section>
            </div>
          </div>

          <div className="hrms-grid">
            <EmployeeSection />
            <AttendanceSection />
            <LeaveSection />
            <PayrollSection />
            <RecruitmentSection />
            <PerformanceSection />
          </div>
        </main>
      </div>
    </div>
  )
}

function Scope({ scope, onChange }) {
  return (
    <div className="dash-tabs">
      {['Organisation', 'Marketing'].map((option) => (
        <button
          key={option}
          type="button"
          className={`dash-tab${scope === option ? ' is-active' : ''}`}
          aria-pressed={scope === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
