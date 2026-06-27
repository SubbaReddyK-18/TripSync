import api from './client'

export const createBudget = (tripId, data) => api.post(`/trips/${tripId}/budget`, data)
export const getBudget = (tripId) => api.get(`/trips/${tripId}/budget`)
export const updateBudget = (tripId, data) => api.patch(`/trips/${tripId}/budget`, data)
export const getBudgetAnalytics = (tripId) => api.get(`/trips/${tripId}/budget/analytics`)
export const getBudgetHistory = (tripId) => api.get(`/trips/${tripId}/budget/history`)
