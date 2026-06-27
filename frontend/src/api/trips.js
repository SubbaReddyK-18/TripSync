import api from './client'

export const createTrip = (data) => api.post('/trips', data)
export const getTrips = () => api.get('/trips')
export const getTrip = (id) => api.get(`/trips/${id}`)
export const updateTrip = (id, data) => api.patch(`/trips/${id}`, data)
export const deleteTrip = (id) => api.delete(`/trips/${id}`)
export const joinTrip = (id) => api.post(`/trips/${id}/join`)
export const joinTripByCode = (invite_code) => api.post('/trips/join-by-code', { invite_code })
export const inviteByEmail = (id, email) => api.post(`/trips/${id}/invite`, { email })
export const regenerateCode = (id) => api.post(`/trips/${id}/invite_code/regenerate`)
export const getMembers = (id) => api.get(`/trips/${id}/members`)
export const updateMemberRole = (tripId, userId, role) => api.patch(`/trips/${tripId}/members/${userId}`, { role })
export const removeMember = (tripId, userId) => api.delete(`/trips/${tripId}/members/${userId}`)
export const getActivity = (id) => api.get(`/trips/${id}/activity`)

export const downloadReport = (tripId, format = 'pdf') => api.get(`/trips/${tripId}/report`, { params: { format }, responseType: 'blob' })
