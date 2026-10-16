import { useState } from 'react'
import { objectives } from '../me/objectives'
import '../me/objectives.css'
import './performance.css'

const TOP_TABS = ['Objectives', '1:1 Meetings', 'Skills']

const SCOPES = [
  { id: 'mine', label: 'Me', heading: 'My Objectives' },
  { id: 'department', label: 'Department', heading: 'Department Objectives' },
  { id: 'company', label: 'Company', heading: 'Company Objectives' },
]

const PERIODS = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026']

const STATUSES = [
  { key: 'Not started', tone: 'not-started' },
  { key: 'At risk', tone: 'at-risk' },
  { key: 'Needs attention', tone: 'needs-attention' },
  { key: 'On track', tone: 'on-track' },
  { key: 'Closed', tone: 'closed' },
]

const PATHS = {
  chevron: <path d="M6 9l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
}

function Glyph({ name, size = 14 }) {
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
      {PATHS[name]}
    </svg>
  )
}

export default function PerformancePage() {
  const [scope, setScope] = useState('mine')
  const [period, setPeriod] = useState('Q2-2026')

  const activeScope = SCOPES.find((item) => item.id === scope)
  const average = objectives.length
    ? Math.round(objectives.reduce((sum, objective) => sum + objective.progress, 0) / objectives.length)
    : 0

  return (
    <div className="obj-page perf-page">
      <nav className="obj-top-tabs" aria-label="Performance sections">
        {TOP_TABS.map((tab) => (
          <span key={tab} className={tab === 'Objectives' ? 'obj-top-tab is-active' : 'obj-top-tab'}>
            {tab}
          </span>
        ))}
      </nav>

      <nav className="obj-sub-tabs" aria-label="Objective scope">
        {SCOPES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={scope === item.id ? 'obj-sub-tab perf-tab is-active' : 'obj-sub-tab perf-tab'}
            aria-pressed={scope === item.id}
            onClick={() => setScope(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="obj-body">
        <div className="obj-heading">
          <h2>{activeScope.heading}</h2>
          <label className="obj-select">
            <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Period">
              {PERIODS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Glyph name="chevron" size={12} />
          </label>
        </div>

        <div className="obj-filters">
          <div className="obj-filter obj-filter-type">
            <span className="obj-filter-label">Objective type</span>
            <span className="obj-filter-value">3 selected</span>
          </div>
          <div className="obj-filter">
            <span className="obj-filter-label">Status</span>
            <Glyph name="chevron" size={12} />
          </div>
          <div className="obj-filter">
            <span className="obj-filter-label">Tags</span>
            <Glyph name="chevron" size={12} />
          </div>
          <label className="obj-search">
            <Glyph name="search" size={16} />
            <input type="search" placeholder="Search" />
          </label>
          <button type="button" className="perf-filter-btn perf-tab" aria-label="More filters">
            <Glyph name="filter" size={16} />
          </button>
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
            <Glyph name="chevron" size={12} />
            <span className="obj-group-title">{period}</span>
            <span className="obj-group-bar" aria-hidden="true">
              <span style={{ width: `${average}%` }} />
            </span>
            <span className="obj-muted">{average}%</span>
            <Glyph name="info" size={14} />
          </header>
          {objectives.length === 0 && (
            <p className="obj-group-empty">
              <Glyph name="info" size={16} />
              There are no objectives added in this timeframe.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
