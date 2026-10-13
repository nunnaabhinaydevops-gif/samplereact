import { useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { useOutsideClick } from '../hooks/useOutsideClick'
import { describeWriteError } from '../lib/errors'
import { formatDateTime } from '../lib/format'
import { markNotificationRead } from '../services/notifications'
import { EmptyState, ErrorState, LoadingState } from './ui'

export default function NotificationsMenu() {
  const { items, unreadCount, loading, error } = useNotifications()
  const [open, setOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false), open)

  async function handleItemClick(item) {
    if (item.readAt) return
    setActionError('')
    try {
      await markNotificationRead(item.id)
    } catch (err) {
      setActionError(describeWriteError(err))
    }
  }

  let body
  if (loading) body = <LoadingState label="Loading…" />
  else if (error) body = <div className="p-4"><ErrorState message={error} /></div>
  else if (items.length === 0)
    body = <EmptyState title="You are all caught up" message="New approvals and updates will appear here." />
  else
    body = (
      <ul className="divide-y divide-slate-100">
        {items.slice(0, 20).map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => handleItemClick(item)}
              className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${item.readAt ? '' : 'bg-brand-100/40'}`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-brand-500'}`} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-900">{item.title}</span>
                {item.body && <span className="block text-sm text-slate-600">{item.body}</span>}
                <span className="mt-1 block text-xs text-slate-400">{formatDateTime(item.createdAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Notifications</div>
          <div className="max-h-96 overflow-y-auto">{body}</div>
          {actionError && <p role="alert" className="border-t border-slate-100 px-4 py-2 text-xs text-red-700">{actionError}</p>}
        </div>
      )}
    </div>
  )
}
