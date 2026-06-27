import api from './client'

export const getDashboardOverview = (params) => api.get('/dashboard/overview', { params })
export const getDashboardExpenses = (params) => api.get('/dashboard/expenses', { params })
export const getDashboardSettlements = () => api.get('/dashboard/settlements')
export const getDashboardBudget = () => api.get('/dashboard/budget')
export const getDashboardActivity = () => api.get('/dashboard/activity')
export const getAllActivity = (limit = 50, days = 'all') => api.get('/dashboard/activity', { params: { limit, days } })
