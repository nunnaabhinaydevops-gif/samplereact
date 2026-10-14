export function Kpi({ label, value, tone }) {
  return (
    <div className={tone ? `hrms-kpi hrms-kpi-${tone}` : 'hrms-kpi'}>
      <span className="hrms-kpi-value">{value}</span>
      <span className="hrms-kpi-label">{label}</span>
    </div>
  )
}

export function Chip({ tone = 'neutral', children }) {
  return <span className={`hrms-chip hrms-chip-${tone}`}>{children}</span>
}

export function Progress({ value, tone = 'blue' }) {
  return (
    <div className="hrms-progress">
      <div className={`hrms-fill is-${tone}`} style={{ width: `${value}%` }} />
    </div>
  )
}

export function Panel({ title, action, className = '', children }) {
  return (
    <section className={`dash-card hrms-panel ${className}`.trim()}>
      <div className="hrms-panel-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}
