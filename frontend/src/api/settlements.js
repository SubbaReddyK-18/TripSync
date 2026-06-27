import api from './client'

export const getSettlements = (tripId) => api.get(`/trips/${tripId}/settlements`)
export const getMySettlements = (tripId) => api.get(`/trips/${tripId}/settlements/my`)
export const paySettlement = (tripId, id, data) => api.post(`/trips/${tripId}/settlements/${id}/pay`, data)
export const getBalanceSheet = (tripId) => api.get(`/trips/${tripId}/settlements/balances`)
