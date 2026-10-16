import { useState } from 'react'
import './preferences.css'

const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
]

const LANGUAGES = ['English', 'Hindi', 'Telugu']
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']

export default function UserPreferences({
  preferences,
  onSavePreferences,
  onBack,
  displayMode,
  onDisplayModeChange,
  displayModes,
  themeColor,
  onThemeColorChange,
  themeColors,
}) {
  const [section, setSection] = useState('general')
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(preferences)

  function openEditor() {
    setDraft(preferences)
    setIsEditing(true)
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function saveDraft() {
    onSavePreferences(draft)
    setIsEditing(false)
  }

  return (
    <div className="prefs">
      <button type="button" className="prefs-back" onClick={onBack}>
        <ArrowLeftIcon />
        Back to Application
      </button>
      <h2 className="prefs-title">User Preferences</h2>
      <p className="prefs-subtitle">Here you can manage all your personal settings like general, appearance, etc.</p>

      <div className="prefs-layout">
        <nav className="prefs-nav" aria-label="Preference sections">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? 'prefs-nav-item is-active' : 'prefs-nav-item'}
              aria-current={section === item.id ? 'page' : undefined}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="prefs-card">
          {section === 'general' ? (
            <>
              <div className="prefs-card-head">
                <div>
                  <h3>General</h3>
                  <p>Customize app language, Date format, etc.</p>
                </div>
                <button type="button" className="prefs-edit" onClick={openEditor}>
                  <PencilIcon />
                  Edit
                </button>
              </div>
              <dl className="prefs-values">
                <div>
                  <dt>App language</dt>
                  <dd>{preferences.language}</dd>
                </div>
                <div>
                  <dt>Date format</dt>
                  <dd>{preferences.dateFormat}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <div className="prefs-card-head">
                <div>
                  <h3>Appearance</h3>
                  <p>Choose how the dashboard looks.</p>
                </div>
              </div>
              <div className="prefs-group">
                <span className="prefs-label">Display mode</span>
                <div className="prefs-options">
                  {displayModes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={displayMode === mode.id ? 'prefs-option is-selected' : 'prefs-option'}
                      aria-pressed={displayMode === mode.id}
                      onClick={() => onDisplayModeChange(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="prefs-group">
                <span className="prefs-label">Theme color</span>
                <div className="prefs-options">
                  {themeColors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      className={themeColor.id === color.id ? 'prefs-option is-selected' : 'prefs-option'}
                      aria-pressed={themeColor.id === color.id}
                      onClick={() => onThemeColorChange(color)}
                    >
                      <span className="prefs-swatch" style={{ background: color.value }} />
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {isEditing && (
        <div className="prefs-backdrop" onClick={() => setIsEditing(false)}>
          <aside
            className="prefs-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prefs-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="prefs-drawer-head">
              <h3 id="prefs-drawer-title">Edit general settings</h3>
              <button type="button" className="prefs-close" aria-label="Close" onClick={() => setIsEditing(false)}>
                <CloseIcon />
              </button>
            </header>

            <div className="prefs-drawer-body">
              <label className="prefs-field">
                <span>App language</span>
                <select value={draft.language} onChange={(event) => updateDraft('language', event.target.value)}>
                  {LANGUAGES.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
              <label className="prefs-field">
                <span>Date format</span>
                <select value={draft.dateFormat} onChange={(event) => updateDraft('dateFormat', event.target.value)}>
                  {DATE_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <footer className="prefs-drawer-foot">
              <button type="button" className="prefs-cancel" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="button" className="prefs-update" onClick={saveDraft}>
                Update
              </button>
            </footer>
          </aside>
        </div>
      )}
    </div>
  )
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
