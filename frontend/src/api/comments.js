import api from './client'

export const createComment = (tripId, data) => api.post(`/trips/${tripId}/comments`, data)
export const getComments = (tripId, params) => api.get(`/trips/${tripId}/comments`, { params })
export const deleteComment = (tripId, id) => api.delete(`/trips/${tripId}/comments/${id}`)
