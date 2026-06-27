import { create } from 'zustand'
import * as notificationsApi from '../api/notifications'

const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const { data } = await notificationsApi.getNotifications()
      set({ notifications: data.data.notifications })
    } catch {}
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await notificationsApi.getUnreadCount()
      set({ unreadCount: data.data.unread_count })
    } catch {}
  },

  markRead: async (id) => {
    try {
      await notificationsApi.markRead(id)
      set((s) => ({
        unreadCount: Math.max(0, s.unreadCount - 1),
        notifications: s.notifications.map((n) =>
          n._id === id ? { ...n, is_read: true } : n
        ),
      }))
    } catch {}
  },

  markAllRead: async () => {
    try {
      await notificationsApi.markAllRead()
      set((s) => ({
        unreadCount: 0,
        notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      }))
    } catch {}
  },
}))

export default useNotificationStore
