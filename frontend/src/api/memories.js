import api from './client'

export const createMemory = (tripId, data) => api.post(`/trips/${tripId}/memories`, data)
export const getMemories = (tripId) => api.get(`/trips/${tripId}/memories`)
export const getMemory = (tripId, id) => api.get(`/trips/${tripId}/memories/${id}`)
export const updateMemory = (tripId, id, data) => api.patch(`/trips/${tripId}/memories/${id}`, data)
export const deleteMemory = (tripId, id) => api.delete(`/trips/${tripId}/memories/${id}`)
