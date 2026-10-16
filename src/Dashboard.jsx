import { useEffect, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import AttendanceSection from './hrms/AttendanceSection.jsx'
import EmployeeSection from './hrms/EmployeeSection.jsx'
import LeaveSection from './hrms/LeaveSection.jsx'
import PayrollSection from './hrms/PayrollSection.jsx'
import FinanceSection from './finance/FinanceSection.jsx'
import PerformanceSection from './hrms/PerformanceSection.jsx'
import RecruitmentSection from './hrms/RecruitmentSection.jsx'
import MeSection from './me/MeSection.jsx'
import MyProfile from './me/MyProfile.jsx'
import UserPreferences from './preferences/UserPreferences.jsx'
import ChangePassword from './account/ChangePassword.jsx'
import ObjectivesPage from './me/ObjectivesPage.jsx'
import PerformancePage from './performance/PerformancePage.jsx'
import StaffList from './team/StaffList.jsx'
import TeamSummary from './team/TeamSummary.jsx'
import TeamTabs from './team/TeamTabs.jsx'
import { TEAM_TABS } from './team/tabs.js'
import { formatDate } from './hrms/format.js'
import { getLeaveBalances, holidays, initialLeaveRequests } from './hrms/data.js'
import './Dashboard.css'
import './hrms/hrms.css'

const ATV_MARK_URL =
  'https://cdn.builder.io/api/v1/image/assets%2Fbe4f45e0d3a8447cad3e911783d5b4fa%2F763872ed0a73419193efedc08b2ca7a5?format=webp&width=800&height=1200'

const INBOX_COUNT = 3

const initialNotifications = [
  { id: 1, text: 'Got a minute? Share your thoughts in the new Pulse Survey.', ago: '3w', unread: true },
  { id: 2, text: 'Got a minute? Share your thoughts in the new Pulse Survey.', ago: '1mo', unread: true },
  { id: 3, text: 'Got a minute? Share your thoughts in the new Pulse Survey.', ago: '2mo', unread: true },
  { id: 4, text: 'Got a minute? Share your thoughts in the new Pulse Survey.', ago: '3mo', unread: true },
]

const DISPLAY_MODES = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'auto', label: 'Auto', icon: 'monitor' },
]

const THEME_COLORS = [
  { id: 'purple', label: 'Purple', value: '#5b4bb0' },
  { id: 'blue', label: 'Blue', value: '#1f5fd1' },
  { id: 'pink', label: 'Pink', value: '#b4487d' },
  { id: 'green', label: 'Green', value: '#4ea56f' },
  { id: 'orange', label: 'Orange', value: '#e89a2e' },
]

const meMenu = [
  { label: 'Attendance' },
  { label: 'Leave' },
  {
    label: 'Performance',
    children: [
      { label: 'Objectives', view: 'objectives' },
      { label: '1:1 Meetings' },
      { label: 'Feedback' },
      { label: 'PIP' },
      { label: 'Reviews' },
      { label: 'Skills' },
      { label: 'Competencies & Core values' },
    ],
  },
  {
    label: 'Expenses & Travel',
    children: [{ label: 'Pending Expenses' }, { label: 'Past Claims' }, { label: 'Advance Requests' }],
  },
  { label: 'Apps', children: [{ label: 'My Apps' }, { label: 'Apps center' }] },
]

const railItems = [
  { label: 'Home', icon: 'home', view: 'home' },
  { label: 'Me', icon: 'user', view: 'me', menu: meMenu },
  { label: 'My Team', icon: 'team', view: 'team', hoverMenu: TEAM_TABS },
  { label: 'Org', icon: 'building' },
  { label: 'Time', icon: 'clock' },
  { label: 'My Finances', icon: 'wallet', view: 'finances' },
  { label: 'Timesheet', icon: 'calendar' },
  { label: 'Performance', icon: 'chart', view: 'performance' },
]

const composerTabs = [
  { label: 'Post', icon: 'edit' },
  { label: 'Announcement', icon: 'megaphone' },
  { label: 'Poll', icon: 'poll' },
  { label: 'Praise', icon: 'praise' },
]

const todayCounts = [
  { label: 'Birthdays', value: 8, icon: 'cake' },
  { label: 'Work anniversaries', value: 2, icon: 'award' },
  { label: 'New joinees', value: 4, icon: 'userPlus' },
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
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  megaphone: <path d="M3 11v2a1 1 0 0 0 1 1h2l6 4V6L6 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8" />,
  poll: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  praise: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  cake: (
    <>
      <path d="M4 21V11h16v10M4 15c2 1 4 1 6 0s4-1 6 0 2 1 4 0M12 11V7" />
      <path d="M12 4v.01" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14L7 22l5-2.5L17 22l-1.5-8" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-6 7-6s7 2.1 7 6M19 8v6M16 11h6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
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
  pulse: <path d="M2 12h4l2.5-6 5 12 2.5-6H22" />,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  monitor: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.4-.2-.8-.4-1.1-.2-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.4-4-7.7-9-7.7z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7.5" r="1" />
      <circle cx="14.5" cy="7.5" r="1" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
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

function ProfileMenuItem({ icon, label, onClick, expanded, children }) {
  const hasSubmenu = expanded !== undefined

  return (
    <li className="dash-profile-group">
      <button
        type="button"
        className={expanded ? 'dash-profile-item is-open' : 'dash-profile-item'}
        aria-expanded={hasSubmenu ? expanded : undefined}
        onClick={onClick}
      >
        <Icon name={icon} />
        <span className="dash-profile-label">{label}</span>
        {hasSubmenu && <ChevronRight />}
      </button>
      {expanded && children}
    </li>
  )
}

function initialsOf(text) {
  return text
    .split(' ')
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function toIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
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
  const [view, setView] = useState('home')
  const [composerTab, setComposerTab] = useState('Post')
  const [celebrationTab, setCelebrationTab] = useState('Birthdays')
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests)
  const [openRailMenu, setOpenRailMenu] = useState(null)
  const [hoverRailMenu, setHoverRailMenu] = useState(null)
  const [teamTab, setTeamTab] = useState('summary')
  const railRef = useRef(null)
  const railMenuRef = useRef(null)
  const topActionsRef = useRef(null)
  const [openTopMenu, setOpenTopMenu] = useState(null)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [openProfileSubmenu, setOpenProfileSubmenu] = useState(null)
  const [displayMode, setDisplayMode] = useState('light')
  const [themeColor, setThemeColor] = useState(THEME_COLORS[0])
  const [preferences, setPreferences] = useState({ language: 'English', dateFormat: 'DD/MM/YYYY' })

  useEffect(() => {
    if (!openRailMenu) return

    function handlePointerDown(event) {
      if (railRef.current?.contains(event.target) || railMenuRef.current?.contains(event.target)) return
      setOpenRailMenu(null)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpenRailMenu(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openRailMenu])

  useEffect(() => {
    if (!openTopMenu) return

    function handlePointerDown(event) {
      if (topActionsRef.current?.contains(event.target)) return
      setOpenTopMenu(null)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpenTopMenu(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openTopMenu])

  function toggleTopMenu(menu) {
    setOpenTopMenu((current) => (current === menu ? null : menu))
    setOpenProfileSubmenu(null)
  }

  function toggleProfileSubmenu(submenu) {
    setOpenProfileSubmenu((current) => (current === submenu ? null : submenu))
  }

  function markAllNotificationsRead() {
    setNotifications((items) => items.map((item) => ({ ...item, unread: false })))
  }

  function handleRailClick(event, item) {
    if (item.view) setView(item.view)
    if (!item.menu || openRailMenu?.item === item) {
      setOpenRailMenu(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setOpenRailMenu({ item, top: rect.top, left: rect.right })
  }

  function openHoverMenu(event, item) {
    if (!item.hoverMenu) return
    const rect = event.currentTarget.getBoundingClientRect()
    setHoverRailMenu({ item, top: rect.top, left: rect.right })
  }

  function selectTeamTab(tab) {
    setView('team')
    setTeamTab(tab)
    setHoverRailMenu(null)
  }

  function closeRailMenu(view) {
    setOpenRailMenu(null)
    if (view) setView(view)
  }

  const name = user.displayName || user.email.split('@')[0]
  const initial = name.charAt(0).toUpperCase()
  const visiblePosts = posts.filter((post) => post.scope === scope)
  const balances = getLeaveBalances(leaveRequests)
  const nextHoliday = holidays[0]
  const todayIso = toIsoDate(now)
  const onLeaveToday = leaveRequests.filter(
    (request) => request.status === 'Approved' && request.from <= todayIso && todayIso <= request.to,
  )
  const celebration = todayCounts.find((item) => item.label === celebrationTab)
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

  const activeRailView = view === 'objectives' || view === 'profile' ? 'me' : view

  return (
    <div className="dash" style={{ '--dash-accent': themeColor.value }}>
      <div className="dash-brandcell">
        <img src={ATV_MARK_URL} alt="ATV Technologies" />
      </div>

      <header className="dash-topbar">
        <span className="dash-brand-name">ATV Technologies</span>
        <label className="dash-search">
          <Icon name="search" />
          <input type="search" placeholder="Search employees, actions" />
        </label>
        <div ref={topActionsRef} className="dash-topbar-actions">
          <button type="button" className="dash-icon-btn" aria-label="Settings">
            <Icon name="gear" />
          </button>
          <button
            type="button"
            className="dash-icon-btn"
            aria-label="Notifications"
            aria-expanded={openTopMenu === 'notifications'}
            onClick={() => toggleTopMenu('notifications')}
          >
            <Icon name="bell" />
          </button>
          <button
            type="button"
            className="dash-user"
            aria-haspopup="menu"
            aria-expanded={openTopMenu === 'profile'}
            onClick={() => toggleTopMenu('profile')}
          >
            <span className="dash-avatar">{initial}</span>
            <span>{name}</span>
          </button>

          {openTopMenu === 'notifications' && (
            <div className="dash-popover dash-notifications" role="dialog" aria-label="Notifications">
              <div className="dash-popover-head">
                <span>Notifications</span>
                <button type="button" className="dash-link-btn" onClick={markAllNotificationsRead}>
                  Mark all as read
                </button>
              </div>
              <ul className="dash-notice-list">
                {notifications.map((item) => (
                  <li key={item.id} className={item.unread ? 'dash-notice is-unread' : 'dash-notice'}>
                    <span className="dash-notice-dot" aria-hidden="true" />
                    <span className="dash-notice-icon">
                      <Icon name="pulse" />
                    </span>
                    <div>
                      <p>{item.text}</p>
                      <time>{item.ago}</time>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {openTopMenu === 'profile' && (
            <ul className="dash-popover dash-profile-menu">
              <ProfileMenuItem
                icon="user"
                label="My profile"
                onClick={() => {
                  setView('profile')
                  setOpenTopMenu(null)
                }}
              />
              <ProfileMenuItem
                icon="sun"
                label="Display mode"
                expanded={openProfileSubmenu === 'display'}
                onClick={() => toggleProfileSubmenu('display')}
              >
                <ul className="dash-popover dash-profile-submenu">
                  {DISPLAY_MODES.map((mode) => (
                    <li key={mode.id}>
                      <button
                        type="button"
                        className={displayMode === mode.id ? 'dash-profile-item is-selected' : 'dash-profile-item'}
                        onClick={() => setDisplayMode(mode.id)}
                      >
                        <Icon name={mode.icon} />
                        <span className="dash-profile-label">{mode.label}</span>
                        {displayMode === mode.id && (
                          <span className="dash-profile-check">
                            <Icon name="check" />
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </ProfileMenuItem>
              <ProfileMenuItem
                icon="palette"
                label="Theme color"
                expanded={openProfileSubmenu === 'theme'}
                onClick={() => toggleProfileSubmenu('theme')}
              >
                <ul className="dash-popover dash-profile-submenu">
                  {THEME_COLORS.map((color) => (
                    <li key={color.id}>
                      <button
                        type="button"
                        className={themeColor.id === color.id ? 'dash-profile-item is-selected' : 'dash-profile-item'}
                        onClick={() => setThemeColor(color)}
                      >
                        <span className="dash-swatch" style={{ background: color.value }} />
                        <span className="dash-profile-label">{color.label}</span>
                        {themeColor.id === color.id && (
                          <span className="dash-profile-check">
                            <Icon name="check" />
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </ProfileMenuItem>
              <ProfileMenuItem
                icon="gear"
                label="User preferences"
                onClick={() => {
                  setView('preferences')
                  setOpenTopMenu(null)
                }}
              />
              <ProfileMenuItem
                icon="key"
                label="Change password"
                onClick={() => {
                  setView('password')
                  setOpenTopMenu(null)
                }}
              />
              <ProfileMenuItem icon="logout" label="Logout" onClick={() => signOut(auth)} />
            </ul>
          )}
        </div>
      </header>

      <nav ref={railRef} className="dash-rail">
        {railItems.map((item) => (
          <div
            key={item.label}
            className="dash-rail-slot"
            onMouseEnter={(event) => openHoverMenu(event, item)}
            onMouseLeave={() => setHoverRailMenu(null)}
          >
            <button
              type="button"
              className={item.view === activeRailView ? 'dash-rail-item is-active' : 'dash-rail-item'}
              aria-expanded={item.menu ? openRailMenu?.item === item : undefined}
              onClick={(event) => handleRailClick(event, item)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
            {hoverRailMenu?.item === item && (
              <ul className="dash-menu" style={{ top: hoverRailMenu.top, left: hoverRailMenu.left }}>
                {item.hoverMenu.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={view === 'team' && teamTab === entry.id ? 'dash-menu-link is-active' : 'dash-menu-link'}
                      onClick={() => selectTeamTab(entry.id)}
                    >
                      {entry.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>

      {openRailMenu && (
        <ul ref={railMenuRef} className="dash-menu" style={{ top: openRailMenu.top, left: openRailMenu.left }}>
          {openRailMenu.item.menu.map((entry) => (
            <li key={entry.label} className="dash-menu-group">
              <button
                type="button"
                className="dash-menu-link"
                onClick={entry.children ? undefined : () => closeRailMenu(openRailMenu.item.view)}
              >
                {entry.label}
                {entry.children && <ChevronRight />}
              </button>
              {entry.children && (
                <ul className="dash-submenu">
                  {entry.children.map((child) => (
                    <li key={child.label}>
                      <button
                        type="button"
                        className="dash-menu-link"
                        onClick={() => closeRailMenu(child.view ?? openRailMenu.item.view)}
                      >
                        {child.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <main className="dash-content">
        {view === 'me' ? (
          <MeSection user={user} />
        ) : view === 'profile' ? (
          <MyProfile user={user} />
        ) : view === 'preferences' ? (
          <UserPreferences
            preferences={preferences}
            onSavePreferences={setPreferences}
            onBack={() => setView('home')}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            displayModes={DISPLAY_MODES}
            themeColor={themeColor}
            onThemeColorChange={setThemeColor}
            themeColors={THEME_COLORS}
          />
        ) : view === 'password' ? (
          <ChangePassword user={user} onBack={() => setView('home')} />
        ) : view === 'team' ? (
          <>
            <TeamTabs active={teamTab} onChange={setTeamTab} />
            {teamTab === 'summary' ? <TeamSummary user={user} /> : <StaffList user={user} />}
          </>
        ) : view === 'finances' ? (
          <FinanceSection user={user} />
        ) : view === 'objectives' ? (
          <ObjectivesPage />
        ) : view === 'performance' ? (
          <PerformancePage />
        ) : (
          <>
            <section className="dash-welcome">
              <h2>Welcome {name}!</h2>
            </section>

            <div className="dash-columns">
              <div className="dash-stack">
                <h3 className="dash-section-title">Quick Access</h3>

                <section className="dash-holiday">
                  <p className="dash-holiday-label">Holidays</p>
                  <h3>{nextHoliday.name}</h3>
                  <p>{formatDate(nextHoliday.date)}</p>
                </section>

                <section className="dash-card">
                  <h4 className="dash-card-title">On leave today</h4>
                  {onLeaveToday.length === 0 ? (
                    <p className="dash-empty">No one is on leave today.</p>
                  ) : (
                    <div className="dash-leave-list">
                      {onLeaveToday.map((request) => {
                        const person = request.employee === 'You' ? name : request.employee
                        return (
                          <div key={request.id} className="dash-leave-person">
                            <span className="dash-peer-avatar">{initialsOf(person)}</span>
                            <span>{person}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
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
                        key={tab.label}
                        type="button"
                        className={composerTab === tab.label ? 'dash-composer-tab is-active' : 'dash-composer-tab'}
                        onClick={() => setComposerTab(tab.label)}
                      >
                        <Icon name={tab.icon} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <textarea placeholder="Write your post here and mention your peers" rows={3} />
                </section>

                <section className="dash-card dash-announcements">
                  <p>No announcements</p>
                  <button
                    type="button"
                    className="dash-add-btn"
                    aria-label="Add announcement"
                    onClick={() => setComposerTab('Announcement')}
                  >
                    <Icon name="plus" />
                  </button>
                </section>

                <section className="dash-card dash-celebrations">
                  <div className="dash-celebration-tabs">
                    {todayCounts.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className={
                          celebrationTab === item.label ? 'dash-celebration-tab is-active' : 'dash-celebration-tab'
                        }
                        onClick={() => setCelebrationTab(item.label)}
                      >
                        <Icon name={item.icon} />
                        <strong>{item.value}</strong> {item.label}
                      </button>
                    ))}
                  </div>
                  <p className="dash-celebration-text">
                    {celebration.value
                      ? `${celebration.value} ${celebration.label.toLowerCase()} today`
                      : `No ${celebration.label.toLowerCase()} today`}
                  </p>
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
