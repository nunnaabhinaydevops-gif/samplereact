import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import AttendanceSection from './hrms/AttendanceSection.jsx'
import EmployeeSection from './hrms/EmployeeSection.jsx'
import LeaveSection from './hrms/LeaveSection.jsx'
import PayrollSection from './hrms/PayrollSection.jsx'
import PerformanceSection from './hrms/PerformanceSection.jsx'
import RecruitmentSection from './hrms/RecruitmentSection.jsx'
import MeSection from './me/MeSection.jsx'
import { formatDate } from './hrms/format.js'
import { getLeaveBalances, holidays, initialLeaveRequests } from './hrms/data.js'
import './Dashboard.css'
import './hrms/hrms.css'

const ATV_MARK_URL =
  'https://cdn.builder.io/api/v1/image/assets%2Fbe4f45e0d3a8447cad3e911783d5b4fa%2F763872ed0a73419193efedc08b2ca7a5?format=webp&width=800&height=1200'

const INBOX_COUNT = 3

const railItems = [
  { label: 'Home', icon: 'home', view: 'home' },
  { label: 'Me', icon: 'user', view: 'me' },
  { label: 'My Team', icon: 'team' },
  { label: 'Org', icon: 'building' },
  { label: 'Time', icon: 'clock' },
  { label: 'Payroll', icon: 'wallet' },
  { label: 'Timesheet', icon: 'calendar' },
  { label: 'Performance', icon: 'chart' },
]

const subnavItems = ['Home', 'Inbox', 'Notifications', 'Activity', 'Events']

const composerTabs = ['Post', 'Announcement', 'Poll', 'Praise']

const todayCounts = [
  { label: 'Birthdays', value: 8 },
  { label: 'Work anniversaries', value: 2 },
  { label: 'New joinees', value: 4 },
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
  team: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c2 .6 3.5 2.2 3.5 5.2" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-3h4v3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M16 13h2M3 10h18" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  chart: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8.5" strokeDasharray="3 3" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
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

function BalanceRing({ label, remaining, total }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const fraction = Math.min(1, Math.max(0, remaining / total))

  return (
    <div className="dash-ring">
      <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
        <circle className="dash-ring-track" cx="32" cy="32" r={radius} />
        <circle
          className="dash-ring-fill"
          cx="32"
          cy="32"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          transform="rotate(-90 32 32)"
        />
        <text className="dash-ring-text" x="32" y="37" textAnchor="middle">
          {remaining}
        </text>
      </svg>
      <span className="dash-ring-label">{label}</span>
    </div>
  )
}

export default function Dashboard({ user }) {
  const now = useNow()
  const [scope, setScope] = useState('Organisation')
  const [activeSubnav, setActiveSubnav] = useState('Home')
  const [view, setView] = useState('home')
  const [composerTab, setComposerTab] = useState('Post')
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests)

  const name = user.displayName || user.email.split('@')[0]
  const initial = name.charAt(0).toUpperCase()
  const visiblePosts = posts.filter((post) => post.scope === scope)
  const balances = getLeaveBalances(leaveRequests)
  const nextHoliday = holidays[0]
  const clock = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const todayLabel = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="dash">
      <div className="dash-brandcell">
        <img src={ATV_MARK_URL} alt="ATV Technologies" />
      </div>

      <header className="dash-topbar">
        <label className="dash-search">
          <Icon name="search" />
          <input type="search" placeholder="Search employees, actions" />
        </label>
        <div className="dash-topbar-actions">
          <button type="button" className="dash-icon-btn" aria-label="Settings">
            <Icon name="gear" />
          </button>
          <button type="button" className="dash-icon-btn" aria-label="Notifications">
            <Icon name="bell" />
          </button>
          <div className="dash-user">
            <span className="dash-avatar">{initial}</span>
            <span>{name}</span>
          </div>
          <button type="button" className="dash-signout" onClick={() => signOut(auth)}>
            <Icon name="logout" />
            Sign out
          </button>
        </div>
      </header>

      <nav className="dash-rail">
        {railItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={item.view === view ? 'dash-rail-item is-active' : 'dash-rail-item'}
            onClick={() => item.view && setView(item.view)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <nav className="dash-subnav">
        {subnavItems.map((item) => (
          <button
            key={item}
            type="button"
            className={activeSubnav === item ? 'dash-subnav-item is-active' : 'dash-subnav-item'}
            onClick={() => setActiveSubnav(item)}
          >
            {item}
            {item === 'Inbox' && <span className="dash-count">{INBOX_COUNT}</span>}
          </button>
        ))}
      </nav>

      <main className="dash-content">
        {view === 'me' ? (
          <MeSection user={user} />
        ) : (
          <>
            <div className="dash-columns">
              <div className="dash-stack">
                <section className="dash-holiday">
                  <p className="dash-holiday-label">Holidays</p>
                  <h3>{nextHoliday.name}</h3>
                  <p>{formatDate(nextHoliday.date)}</p>
                </section>

                <section className="dash-card">
                  <h4 className="dash-card-title">Time today · {todayLabel}</h4>
                  <span className="dash-muted-label">Clocked time</span>
                  <p className="dash-clock">{clock}</p>
                </section>

                <section className="dash-card">
                  <h4 className="dash-card-title">Leave balances</h4>
                  <div className="dash-rings">
                    {balances.map((balance) => (
                      <BalanceRing
                        key={balance.type}
                        label={balance.type.replace(' leave', '')}
                        remaining={balance.total - balance.used}
                        total={balance.total}
                      />
                    ))}
                  </div>
                  <div className="dash-links">
                    <a href="#hrms-modules">Apply leave</a>
                    <a href="#hrms-modules">View all balances</a>
                  </div>
                </section>

                <section className="dash-card">
                  <h4 className="dash-card-title">Inbox</h4>
                  <div className="dash-inbox-row">
                    <span className="dash-inbox-count">{INBOX_COUNT}</span>
                    <p>Tasks waiting for you, including leave approvals and expense claims.</p>
                  </div>
                  <a className="dash-action" href="#hrms-modules">
                    Take action
                  </a>
                </section>

                <section className="dash-card">
                  <h4 className="dash-card-title">Peers</h4>
                  {peers.map((peer) => (
                    <div key={peer.name} className="dash-peer">
                      <span className="dash-peer-avatar">{peer.initials}</span>
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
                <div className="dash-tabs">
                  {['Organisation', 'Marketing'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={scope === option ? 'dash-tab is-active' : 'dash-tab'}
                      aria-pressed={scope === option}
                      onClick={() => setScope(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <section className="dash-card dash-composer">
                  <div className="dash-composer-tabs">
                    {composerTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={composerTab === tab ? 'dash-composer-tab is-active' : 'dash-composer-tab'}
                        onClick={() => setComposerTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <textarea placeholder="Write your post here..." rows={3} />
                </section>

                <section className="dash-card dash-today">
                  <span className="dash-card-title">Today</span>
                  {todayCounts.map((item) => (
                    <span key={item.label} className="dash-today-item">
                      {item.label} <strong>{item.value}</strong>
                    </span>
                  ))}
                </section>

                {visiblePosts.length === 0 && <p className="dash-empty">No posts in {scope} yet.</p>}
                {visiblePosts.map((post) => (
                  <article key={post.id} className="dash-card dash-post">
                    <div className="dash-post-head">
                      <span className="dash-post-avatar">{post.initials}</span>
                      <div>
                        <p>
                          <strong>{post.from}</strong> praised <strong>{post.to}</strong>
                        </p>
                        <p className="dash-post-meta">{post.ago}</p>
                      </div>
                    </div>
                    <div className="dash-post-body">
                      <span className="dash-tag">{post.tag}</span>
                      <p>{post.message}</p>
                    </div>
                    <div className="dash-post-foot">
                      <span>{post.likes} likes</span>
                      <span>{post.comments} comments</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div id="hrms-modules" className="hrms-grid">
              <EmployeeSection />
              <AttendanceSection user={user} />
              <LeaveSection requests={leaveRequests} setRequests={setLeaveRequests} />
              <PayrollSection />
              <RecruitmentSection />
              <PerformanceSection />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
