import api from './client'

export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)
export const logout = () => api.post('/auth/logout')
export const refreshToken = (refresh_token) => api.post('/auth/refresh', { refresh_token })
export const checkAdminExists = () => api.get('/auth/admin-exists')
export const verifyOtp = (email, otp) => api.post('/auth/verify-otp', { email, otp })
export const resendOtp = (email) => api.post('/auth/resend-otp', { email })
export const googleLogin = (data) => api.post('/auth/google-login', data)
