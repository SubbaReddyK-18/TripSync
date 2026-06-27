import api from './client'

export const createExpense = (tripId, data) => api.post(`/trips/${tripId}/expenses`, data)
export const getExpenses = (tripId, params) => api.get(`/trips/${tripId}/expenses`, { params })
export const getExpense = (tripId, id) => api.get(`/trips/${tripId}/expenses/${id}`)
export const updateExpense = (tripId, id, data) => api.patch(`/trips/${tripId}/expenses/${id}`, data)
export const deleteExpense = (tripId, id) => api.delete(`/trips/${tripId}/expenses/${id}`)
