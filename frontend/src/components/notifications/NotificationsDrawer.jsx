import { useEffect } from 'react'
import useNotificationStore from '../../stores/notificationStore'
import useUiStore from '../../stores/uiStore'

export default function NotificationsDrawer() {
  const { notifications, fetchNotifications, markRead, markAllRead } = useNotificationStore()
  const { setNotificationsOpen } = useUiStore()

  useEffect(() => {
    fetchNotifications()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={() => setNotificationsOpen(false)} />
      <div className="relative w-full max-w-sm bg-primary-light border-l border-border h-full overflow-y-auto">
        <div className="sticky top-0 bg-primary-light border-b border-border p-4 flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">Notifications</h2>
          <div className="flex gap-2">
            <button onClick={markAllRead} className="text-xs text-accent-blue hover:underline">Mark all read</button>
            <button onClick={() => setNotificationsOpen(false)} className="text-text-muted hover:text-text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {notifications.length === 0 ? (
            <p className="text-center text-text-muted py-10 text-sm">No notifications</p>
          ) : (
            notifications.map((n) => (
              <div key={n._id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  n.is_read ? 'bg-transparent' : 'bg-accent-blue/5 border border-accent-blue/10'
                }`}
                onClick={() => !n.is_read && markRead(n._id)}
              >
                <p className="text-sm text-text-primary">{n.message}</p>
                <p className="text-xs text-text-muted mt-1">{new Date(n.created_at).toLocaleString(undefined, { timeZone: 'Asia/Kolkata' })}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
