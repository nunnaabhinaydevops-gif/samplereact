import { useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useOutsideClick } from '../hooks/useOutsideClick'
import { fullName } from '../lib/format'

export default function GlobalSearch({ modules, employees, onNavigate }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const term = query.trim().toLowerCase()
  useOutsideClick(ref, () => setOpen(false), open)

  const results = useMemo(() => {
    if (!term) return { pages: [], people: [] }
    return {
      pages: modules.filter((module) => module.label.toLowerCase().includes(term)).slice(0, 5),
      people: employees
        .filter((employee) =>
          [fullName(employee), employee.employeeCode, employee.email].some((value) => value?.toLowerCase().includes(term)),
        )
        .slice(0, 6),
    }
  }, [term, modules, employees])

  const hasResults = results.pages.length > 0 || results.people.length > 0

  function go(key, params) {
    onNavigate(key, params)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative min-w-0 flex-1 max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search employees and pages"
        aria-label="Global search"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
      />
      {open && term && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {hasResults ? (
            <div className="max-h-80 overflow-y-auto py-2 text-sm">
              {results.pages.length > 0 && (
                <div>
                  <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Pages</p>
                  {results.pages.map((module) => (
                    <button key={module.key} type="button" onClick={() => go(module.key)} className="block w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50">
                      {module.label}
                    </button>
                  ))}
                </div>
              )}
              {results.people.length > 0 && (
                <div>
                  <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Employees</p>
                  {results.people.map((employee) => (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => go('employees', { employeeId: employee.id })}
                      className="block w-full px-4 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="block text-slate-900">{fullName(employee)}</span>
                      <span className="block text-xs text-slate-500">{[employee.employeeCode, employee.department].filter(Boolean).join(' · ')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="px-4 py-3 text-sm text-slate-500">{`No matches for "${query}"`}</p>
          )}
        </div>
      )}
    </div>
  )
}
