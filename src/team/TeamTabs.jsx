import { TEAM_TABS } from './tabs'
import './team.css'

export default function TeamTabs({ active, onChange }) {
  return (
    <nav className="team-tabs" aria-label="My team">
      {TEAM_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? 'team-tab is-active' : 'team-tab'}
          aria-current={active === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
