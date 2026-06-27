import api from './client'

export const getMe = () => api.get('/users/me')
export const updateMe = (data) => api.patch('/users/me', data)
export const changePassword = (data) => api.patch('/users/me/password', data)
export const searchUsers = (q) => api.get('/users/search', { params: { q } })
export const getAllUsers = () => api.get('/users')
export const removeProfilePhoto = () => api.delete('/users/me/photo')
