import api from './client'

export const createLocation = (tripId, data) => api.post(`/trips/${tripId}/locations`, data)
export const getLocations = (tripId) => api.get(`/trips/${tripId}/locations`)
export const getLocation = (tripId, id) => api.get(`/trips/${tripId}/locations/${id}`)
export const updateLocation = (tripId, id, data) => api.patch(`/trips/${tripId}/locations/${id}`, data)
export const deleteLocation = (tripId, id) => api.delete(`/trips/${tripId}/locations/${id}`)
