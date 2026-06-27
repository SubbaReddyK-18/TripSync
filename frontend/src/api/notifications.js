import api from './client'

export const getNotifications = () => api.get('/notifications')
export const markRead = (id) => api.patch(`/notifications/${id}/read`)
export const markAllRead = () => api.patch('/notifications/read_all')
export const getUnreadCount = () => api.get('/notifications/unread_count')
