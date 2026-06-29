import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, checkAdminExists, googleLogin } from '../api/auth'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import AnimatedBackground from '../components/auth/AnimatedBackground'
import HeroSection, { FEATURES, ADMIN_FEATURES } from '../components/auth/HeroSection'
import AuthCard from '../components/auth/AuthCard'

export default function LoginPage() {
  const { isDark, toggleTheme } = useUiStore()
  const [activePortal, setActivePortal] = useState('user')
  const [adminExists, setAdminExists] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()

  const [googleClient, setGoogleClient] = useState(null)

  const handleGoogleLogin = () => {
    if (googleClient) {
      googleClient.requestAccessToken()
    } else {
      toast.error('Google Sign-In is initializing. Please try again.')
    }
  }

  useEffect(() => {
    const initGoogleOAuth = () => {
      if (window.google) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "148633718428-1l9e2b10.apps.googleusercontent.com",
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setLoading(true)
              try {
                const { data } = await googleLogin({ token: tokenResponse.access_token })
                storeLogin(data.data.access_token, data.data.refresh_token, data.data.user)
                toast.success(data.message)
                navigate('/dashboard', { replace: true })
              } catch (err) {
                toast.error(err.response?.data?.error?.message || 'Google verification failed')
              } finally {
                setLoading(false)
              }
            }
          },
        })
        setGoogleClient(client)
      }
    }

    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script')
      script.id = 'google-gsi-client'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGoogleOAuth
      document.body.appendChild(script)
    } else {
      initGoogleOAuth()
    }
  }, [navigate, storeLogin])

  useEffect(() => {
    const fetchAdminStatus = async () => {
      try {
        const { data } = await checkAdminExists()
        setAdminExists(data.data.exists)
      } catch (err) {
        console.error('Failed to query admin status', err)
      }
    }
    fetchAdminStatus()
  }, [])

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await login({ email, password })
      storeLogin(data.data.access_token, data.data.refresh_token, data.data.user)
      toast.success(data.message)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative min-h-screen font-body overflow-hidden ${isDark
      ? 'text-white bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
      : 'text-slate-900 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50'}`}>
      <div className="hidden lg:block"><AnimatedBackground isDark={isDark} portal={activePortal} /></div>

      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isDark
              ? 'bg-white/[0.06] border border-white/[0.08] text-yellow-400 hover:bg-white/[0.1]'
              : 'bg-white/70 border border-slate-200/60 text-slate-600 hover:bg-white shadow-sm'
          }`}
        >
          {isDark ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Split Layout */}
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left - Hero Section */}
        <HeroSection mode="login" isDark={isDark} portal={activePortal} showFeatures={false} />

        {/* Right - Auth Card */}
        <AuthCard isDark={isDark}>
          {/* Portal Toggle */}
          <div className={`flex rounded-xl p-1 mb-8 border transition-all ${
            isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-slate-100/70 border-slate-200/60'
          }`}>
            <motion.button
              type="button"
              onClick={() => setActivePortal('user')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activePortal === 'user'
                  ? isDark
                    ? 'bg-white/[0.08] text-accent-blue shadow-sm'
                    : 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              User
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setActivePortal('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activePortal === 'admin'
                  ? isDark
                    ? 'bg-white/[0.08] text-accent-indigo shadow-sm'
                    : 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Admin
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {activePortal === 'user' ? (
              <motion.form
                key="user-login"
                onSubmit={handleLoginSubmit}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
                autoComplete="off"
              >
                <div className="mb-8">
                  <h2 className={`text-2xl font-heading font-bold tracking-tight mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Welcome Back
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Sign in to continue your journeys.
                  </p>
                </div>

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Email or Username
                  </label>
                  <div className={`relative rounded-xl border transition-all duration-300 ${
                    emailFocused
                      ? isDark
                        ? 'border-accent-blue/50 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
                        : 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
                      : isDark
                        ? 'border-white/[0.08] hover:border-white/[0.15]'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className={`w-4 h-4 transition-colors duration-300 ${emailFocused ? 'text-accent-blue' : isDark ? 'text-slate-500' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M22 4L12 13 2 4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder="Enter your email or username"
                      required
                      autoComplete="off"
                      className={`w-full bg-transparent rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Password
                  </label>
                  <div className={`relative rounded-xl border transition-all duration-300 ${
                    passwordFocused
                      ? isDark
                        ? 'border-accent-blue/50 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
                        : 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
                      : isDark
                        ? 'border-white/[0.08] hover:border-white/[0.15]'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className={`w-4 h-4 transition-colors duration-300 ${passwordFocused ? 'text-accent-blue' : isDark ? 'text-slate-500' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      placeholder="Enter password"
                      required
                      autoComplete="new-password"
                      className={`w-full bg-transparent rounded-xl pl-10 pr-10 py-3 text-sm outline-none transition-colors ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors ${
                        isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.01 } : {}}
                  whileTap={!loading ? { scale: 0.99 } : {}}
                  className={`w-full font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center text-sm ${
                    isDark
                      ? 'bg-gradient-to-r from-accent-blue to-accent-indigo hover:from-blue-400 hover:to-indigo-400 text-white shadow-lg shadow-accent-blue/20'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2.5">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing you in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-2">
                  <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200/80'}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Or continue with
                  </span>
                  <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200/80'}`} />
                </div>

                {/* Google Sign In Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleGoogleLogin}
                  className={`w-full py-2.5 px-4 rounded-xl border font-semibold flex items-center justify-center gap-2 text-sm transition-all duration-300 ${
                    isDark
                      ? 'bg-white/[0.02] border-white/[0.08] text-white hover:bg-white/[0.05] hover:border-white/[0.12] hover:shadow-lg'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </motion.button>

                <p className={`text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Don't have an account?{' '}
                  <Link to="/register" className={`font-medium transition-colors ${
                    isDark ? 'text-accent-blue hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}>
                    Register
                  </Link>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="admin-login"
                onSubmit={handleLoginSubmit}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
                autoComplete="off"
              >
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h2 className={`text-2xl font-heading font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Welcome Back
                    </h2>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isDark
                        ? 'bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/20'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    }`}>
                      Admin
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Sign in to manage and monitor the TripSync ecosystem.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Admin Email
                  </label>
                  <div className={`relative rounded-xl border transition-all duration-300 ${
                    emailFocused
                      ? isDark
                        ? 'border-accent-indigo/50 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
                        : 'border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
                      : isDark
                        ? 'border-white/[0.08] hover:border-white/[0.15]'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className={`w-4 h-4 transition-colors duration-300 ${emailFocused ? 'text-accent-indigo' : isDark ? 'text-slate-500' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M22 4L12 13 2 4" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder="Enter admin email"
                      required
                      autoComplete="off"
                      className={`w-full bg-transparent rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Password
                  </label>
                  <div className={`relative rounded-xl border transition-all duration-300 ${
                    passwordFocused
                      ? isDark
                        ? 'border-accent-indigo/50 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
                        : 'border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
                      : isDark
                        ? 'border-white/[0.08] hover:border-white/[0.15]'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className={`w-4 h-4 transition-colors duration-300 ${passwordFocused ? 'text-accent-indigo' : isDark ? 'text-slate-500' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      placeholder="Enter password"
                      required
                      autoComplete="new-password"
                      className={`w-full bg-transparent rounded-xl pl-10 pr-10 py-3 text-sm outline-none transition-colors ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors ${
                        isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.01 } : {}}
                  whileTap={!loading ? { scale: 0.99 } : {}}
                  className={`w-full font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center text-sm ${
                    isDark
                      ? 'bg-gradient-to-r from-accent-indigo to-accent-purple hover:from-indigo-400 hover:to-purple-400 text-white shadow-lg shadow-accent-indigo/20'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2.5">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </AuthCard>
      </div>

      {/* Features Footer */}
      <div className={`lg:hidden px-6 pb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto mb-6">
          {(activePortal === 'admin' ? ADMIN_FEATURES : FEATURES).map((feature, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-100/50'}`}>
              <span className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                isDark
                  ? activePortal === 'admin' ? 'text-accent-indigo bg-accent-indigo/10' : 'text-accent-blue bg-accent-blue/10'
                  : activePortal === 'admin' ? 'text-indigo-600 bg-indigo-50' : 'text-blue-600 bg-blue-50'
              }`}>
                {feature.icon}
              </span>
              <span className="text-xs font-medium">{feature.label}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-text-muted">© TripSync</p>
      </div>
    </div>
  )
}
