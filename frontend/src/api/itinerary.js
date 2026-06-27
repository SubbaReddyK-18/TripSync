import api from './client'

export const createItem = (tripId, data) => api.post(`/trips/${tripId}/itinerary`, data)
export const getItinerary = (tripId) => api.get(`/trips/${tripId}/itinerary`)
export const getItem = (tripId, id) => api.get(`/trips/${tripId}/itinerary/${id}`)
export const updateItem = (tripId, id, data) => api.patch(`/trips/${tripId}/itinerary/${id}`, data)
export const deleteItem = (tripId, id) => api.delete(`/trips/${tripId}/itinerary/${id}`)
