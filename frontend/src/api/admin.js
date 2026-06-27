import api from './client'

export const getActivityLogs = (params) => api.get('/admin/activity-logs', { params })
export const getActionTypes = () => api.get('/admin/activity-logs/action-types')
export const getAdminAnalytics = (params) => api.get('/admin/analytics', { params })
export const getAdminUsers = () => api.get('/admin/users')
export const getSystemConfig = () => api.get('/admin/system-config')
export const updateSystemConfig = (data) => api.put('/admin/system-config', data)
export const getUserStats = (userId) => api.get(`/admin/users/${userId}/stats`)
export const updateUserRole = (userId, role) => api.patch(`/admin/users/${userId}/role`, { role })
export const updateUserStatus = (userId, isActive) => api.patch(`/admin/users/${userId}/status`, { is_active: isActive })

export const exportAnalytics = (params) => api.get('/admin/analytics/export', { params, responseType: 'blob' })
export const exportActivityLogs = (params) => api.get('/admin/activity-logs/export', { params, responseType: 'blob' })
