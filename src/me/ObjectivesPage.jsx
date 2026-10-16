import { useState } from 'react'
import { objectives } from './objectives'
import './objectives.css'

const TOP_TABS = ['Attendance', 'Leave', 'Performance', 'Expenses & Travel', 'Apps']

const SUB_TABS = ['Objectives', '1:1 Meetings', 'Feedback', 'PIP', 'Reviews', 'Skills', 'Competencies & Core values']

const PERIODS = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026']

const SCOPES = [
  {
    id: 'mine',
    label: 'My Objectives',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </>
    ),
  },
  {
    id: 'department',
    label: 'Department Objectives',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c2 .6 3.5 2.2 3.5 5.2" />
      </>
    ),
  },
  {
    id: 'company',
    label: 'Company Objectives',
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="1" />
        <path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-3h4v3" />
      </>
    ),
  },
]

const STATUSES = [
  { key: 'Not started', tone: 'not-started' },
  { key: 'At risk', tone: 'at-risk' },
  { key: 'Needs attention', tone: 'needs-attention' },
  { key: 'On track', tone: 'on-track' },
  { key: 'Closed', tone: 'closed' },
]

function Glyph({ size = 14, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function ChevronDown() {
  return (
    <Glyph size={12}>
      <path d="M6 9l6 6 6-6" />
    </Glyph>
  )
}

export default function ObjectivesPage() {
  const [scope, setScope] = useState('mine')
  const [period, setPeriod] = useState('Q2-2026')

  const average = objectives.length
    ? Math.round(objectives.reduce((sum, objective) => sum + objective.progress, 0) / objectives.length)
    : 0

  return (
    <div className="obj-page">
      <nav className="obj-top-tabs" aria-label="Me sections">
        {TOP_TABS.map((tab) => (
          <span key={tab} className={tab === 'Performance' ? 'obj-top-tab is-active' : 'obj-top-tab'}>
            {tab}
          </span>
        ))}
      </nav>

      <nav className="obj-sub-tabs" aria-label="Performance sections">
        {SUB_TABS.map((tab) => (
          <span key={tab} className={tab === 'Objectives' ? 'obj-sub-tab is-active' : 'obj-sub-tab'}>
            {tab}
          </span>
        ))}
      </nav>

      <div className="obj-body">
        <div className="obj-heading">
          <h2>My Objectives</h2>
          <label className="obj-select">
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              {PERIODS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown />
          </label>
        </div>

        <div className="obj-scopes" role="group" aria-label="Objective scope">
          {SCOPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={scope === item.id ? 'obj-scope is-active' : 'obj-scope'}
              aria-pressed={scope === item.id}
              onClick={() => setScope(item.id)}
            >
              <Glyph size={16}>{item.icon}</Glyph>
              {item.label}
            </button>
          ))}
        </div>

        <div className="obj-filters">
          <div className="obj-filter obj-filter-type">
            <span className="obj-filter-label">Objective type</span>
            <span className="obj-filter-value">3 selected</span>
          </div>
          <div className="obj-filter">
            <span className="obj-filter-label">Status</span>
            <ChevronDown />
          </div>
          <div className="obj-filter">
            <span className="obj-filter-label">Tags</span>
            <ChevronDown />
          </div>
          <label className="obj-search">
            <Glyph size={16}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </Glyph>
            <input type="search" placeholder="Search" />
          </label>
        </div>

        <div className="obj-summary">
          <section className="obj-card obj-progress">
            <h3>Average progress</h3>
            <p className="obj-big">{average} %</p>
            {objectives.length === 0 && <p className="obj-muted-center">No data to display.</p>}
          </section>

          <section className="obj-card obj-status">
            <h3>
              Objective by status <span className="obj-muted">( {objectives.length} objectives)</span>
            </h3>
            <ul>
              {STATUSES.map((status) => (
                <li key={status.key} className={`obj-dot is-${status.tone}`}>
                  {status.key} ({objectives.filter((objective) => objective.status === status.key).length})
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="obj-group">
          <header className="obj-group-head">
            <ChevronDown />
            <span className="obj-group-title">{period}</span>
            <span className="obj-group-bar" aria-hidden="true">
              <span style={{ width: `${average}%` }} />
            </span>
            <span className="obj-muted">{average}%</span>
          </header>
          {objectives.length === 0 && (
            <p className="obj-group-empty">
              <Glyph size={16}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l2 2" />
              </Glyph>
              There are no objectives added in this timeframe.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
