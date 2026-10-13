import { useState } from 'react'
import { initialInterviews, offers, onboardingTasks, openings, pipeline } from './data'
import { Chip, Panel, Progress } from './ui'
import { formatDateTime, statusTone } from './format'

const emptyDraft = { candidate: '', role: openings[0].role, when: '', panel: '' }

export default function RecruitmentSection() {
  const [interviews, setInterviews] = useState(initialInterviews)
  const [draft, setDraft] = useState(emptyDraft)
  const [doneTasks, setDoneTasks] = useState([])

  function scheduleInterview(event) {
    event.preventDefault()
    setInterviews((prev) =>
      [...prev, { id: Date.now(), ...draft }].sort((a, b) => a.when.localeCompare(b.when)),
    )
    setDraft((prev) => ({ ...prev, candidate: '', when: '', panel: '' }))
  }

  function toggleTask(index) {
    setDoneTasks((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index],
    )
  }

  return (
    <Panel title="Recruitment and onboarding">
      <div className="hrms-subhead">
        <span>Job openings</span>
      </div>
      <div className="hrms-table-wrap">
        <table className="hrms-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Department</th>
              <th>Openings</th>
              <th>Candidates</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {openings.map((opening) => (
              <tr key={opening.role}>
                <td>{opening.role}</td>
                <td>{opening.department}</td>
                <td>{opening.openings}</td>
                <td>{opening.candidates}</td>
                <td>
                  <Chip tone="blue">{opening.stage}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hrms-subhead">
        <span>Candidate pipeline</span>
      </div>
      <div className="hrms-stack">
        {pipeline.map((stage) => (
          <div key={stage.stage} className="hrms-pipeline-row">
            <span>{stage.stage}</span>
            <Progress value={(stage.count / pipeline[0].count) * 100} tone="green" />
            <strong>{stage.count}</strong>
          </div>
        ))}
      </div>

      <div className="hrms-subhead">
        <span>Interviews</span>
      </div>
      <ul className="hrms-list">
        {interviews.map((interview) => (
          <li key={interview.id}>
            <div>
              <strong>{interview.candidate}</strong>
              <div className="hrms-muted">
                {interview.role} · Panel: {interview.panel}
              </div>
            </div>
            <span className="hrms-muted">{formatDateTime(interview.when)}</span>
          </li>
        ))}
      </ul>
      <form className="hrms-form" onSubmit={scheduleInterview}>
        <label className="hrms-field">
          Candidate
          <input
            required
            value={draft.candidate}
            onChange={(e) => setDraft({ ...draft, candidate: e.target.value })}
          />
        </label>
        <label className="hrms-field">
          Role
          <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
            {openings.map((opening) => (
              <option key={opening.role}>{opening.role}</option>
            ))}
          </select>
        </label>
        <label className="hrms-field">
          Date and time
          <input
            type="datetime-local"
            required
            value={draft.when}
            onChange={(e) => setDraft({ ...draft, when: e.target.value })}
          />
        </label>
        <label className="hrms-field">
          Panel
          <input required value={draft.panel} onChange={(e) => setDraft({ ...draft, panel: e.target.value })} />
        </label>
        <button type="submit" className="hrms-btn">
          Schedule
        </button>
      </form>

      <div className="hrms-subhead">
        <span>Offer letters</span>
      </div>
      <ul className="hrms-list">
        {offers.map((offer) => (
          <li key={offer.id}>
            <div>
              <strong>{offer.candidate}</strong>
              <div className="hrms-muted">{offer.role}</div>
            </div>
            <Chip tone={statusTone[offer.status]}>{offer.status}</Chip>
          </li>
        ))}
      </ul>

      <div className="hrms-subhead">
        <span>Onboarding checklist · Arjun Mehta</span>
        <span className="hrms-muted">
          {doneTasks.length}/{onboardingTasks.length} done
        </span>
      </div>
      <div className="hrms-checklist">
        {onboardingTasks.map((task, index) => {
          const done = doneTasks.includes(index)
          return (
            <label key={task} className={done ? 'hrms-check is-done' : 'hrms-check'}>
              <input type="checkbox" checked={done} onChange={() => toggleTask(index)} />
              <span>{task}</span>
            </label>
          )
        })}
      </div>
    </Panel>
  )
}
