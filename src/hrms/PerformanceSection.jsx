import {
  appraisalCycle,
  attendanceTrend,
  departments,
  goals,
  leaversLast12Months,
  reviewStatus,
  workforce,
} from './data'
import { Chip, Kpi, Panel, Progress } from './ui'
import { formatDate } from './format'

export default function PerformanceSection() {
  const reviewTotal = reviewStatus.reduce((sum, item) => sum + item.count, 0)
  const completedPercent = Math.round((reviewStatus[0].count / reviewTotal) * 100)
  const attritionRate = ((leaversLast12Months / workforce.total) * 100).toFixed(1)

  return (
    <Panel title="Performance and analytics" className="hrms-wide">
      <div className="hrms-kpis">
        <Kpi label="Appraisal completion" value={`${completedPercent}%`} tone="green" />
        <Kpi label="Attrition (12 months)" value={`${attritionRate}%`} tone="amber" />
        <Kpi label="Leavers (12 months)" value={leaversLast12Months} tone="red" />
        <Kpi label="Headcount" value={workforce.total} tone="blue" />
      </div>

      <div className="hrms-two-col">
        <div className="hrms-stack">
          <div className="hrms-subhead">
            <span>{appraisalCycle.name}</span>
            <span className="hrms-muted">Due {formatDate(appraisalCycle.dueDate)}</span>
          </div>
          <div className="hrms-stack-bar">
            {reviewStatus.map((item) => (
              <div
                key={item.label}
                className={`hrms-fill is-${item.tone}`}
                style={{ width: `${(item.count / reviewTotal) * 100}%` }}
                title={`${item.label}: ${item.count}`}
              />
            ))}
          </div>
          <div className="hrms-chips">
            {reviewStatus.map((item) => (
              <Chip key={item.label} tone={item.tone}>
                {item.label} {item.count}
              </Chip>
            ))}
          </div>

          <div className="hrms-subhead">
            <span>Employee goals</span>
          </div>
          {goals.map((goal) => (
            <div key={goal.title} className="hrms-stack">
              <div className="hrms-line-row">
                <span>{goal.title}</span>
                <strong>{goal.progress}%</strong>
              </div>
              <span className="hrms-muted">{goal.owner}</span>
              <Progress value={goal.progress} />
            </div>
          ))}
        </div>

        <div className="hrms-stack">
          <div className="hrms-subhead">
            <span>Department-wise headcount</span>
          </div>
          {departments.map((department) => (
            <div key={department.name} className="hrms-stack">
              <div className="hrms-line-row">
                <span>{department.name}</span>
                <strong>{department.headcount}</strong>
              </div>
              <Progress value={(department.headcount / workforce.total) * 100} />
            </div>
          ))}

          <div className="hrms-subhead">
            <span>Attendance trend</span>
            <span className="hrms-muted">Last 6 weeks, %</span>
          </div>
          <div className="hrms-trend">
            {attendanceTrend.map((point) => (
              <div key={point.label} className="hrms-trend-bar">
                <span className="hrms-muted">{point.value}</span>
                <div className="hrms-trend-fill" style={{ height: `${(point.value - 80) * 5}%` }} />
                <span className="hrms-muted">{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}
