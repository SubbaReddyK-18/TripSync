import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import AnimatedBackground from '../components/auth/AnimatedBackground'
import HeroSection from '../components/auth/HeroSection'
import AuthCard from '../components/auth/AuthCard'

export default function RegisterPage() {
  const { isDark, toggleTheme, systemConfig } = useUiStore()
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    dob: '',
    password: '',
    confirm_password: '',
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!systemConfig.allowRegistrations) {
      toast.error('Registrations are currently disabled by the administrator.')
      return
    }
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { data } = await register({
        full_name: form.full_name,
        username: form.username,
        email: form.email,
        dob: form.dob,
        password: form.password,
      })
      toast.success(data.message || 'Account created! Verify your email to continue.')
      navigate('/verify-otp?email=' + encodeURIComponent(form.email))
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed'
      toast.error(msg, { duration: 4000 })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (fieldName) => {
    const isFocused = focusedField === fieldName
    return `relative rounded-xl border transition-all duration-300 ${
      isFocused
        ? isDark
          ? 'border-accent-blue/50 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
          : 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
        : isDark
          ? 'border-white/[0.08] hover:border-white/[0.15]'
          : 'border-slate-200 hover:border-slate-300'
    }`
  }

  return (
    <div className={`relative min-h-screen font-body overflow-hidden ${isDark ? 'text-white' : 'text-slate-900'}`}>
      <AnimatedBackground isDark={isDark} />

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
        <HeroSection mode="register" isDark={isDark} />

        {/* Right - Auth Card */}
        <AuthCard isDark={isDark}>
          {!systemConfig.allowRegistrations && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/15 text-red-500 text-sm font-medium text-center">
              Registrations are currently disabled by the administrator.
            </div>
          )}

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="mb-6">
              <h2 className={`text-2xl font-heading font-bold tracking-tight mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Create Account
              </h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Start your next adventure.
              </p>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Full Name
                </label>
                <div className={inputStyle('full_name')}>
                  <input
                    name="full_name"
                    type="text"
                    value={form.full_name}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('full_name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your full name"
                    required
                    className={`w-full bg-transparent rounded-xl px-4 py-3 text-sm outline-none transition-colors ${
                      isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Username + DOB grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Username
                  </label>
                  <div className={inputStyle('username')}>
                    <input
                      name="username"
                      type="text"
                      value={form.username}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your username"
                      required
                      className={`w-full bg-transparent rounded-xl px-4 py-3 text-sm outline-none transition-colors ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Date of Birth
                  </label>
                  <div className={inputStyle('dob')}>
                    <input
                      name="dob"
                      type="date"
                      value={form.dob}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('dob')}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`w-full bg-transparent rounded-xl px-4 py-3 text-sm outline-none transition-colors [color-scheme:${isDark ? 'dark' : 'light'}] ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Email Address
                </label>
                <div className={inputStyle('email')}>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="you@example.com"
                    required
                    className={`w-full bg-transparent rounded-xl px-4 py-3 text-sm outline-none transition-colors ${
                      isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Password + Confirm grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Password
                  </label>
                  <div className={inputStyle('password')}>
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      className={`w-full bg-transparent rounded-xl pr-10 pl-4 py-3 text-sm outline-none transition-colors ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Confirm Password
                  </label>
                  <div className={inputStyle('confirm_password')}>
                    <input
                      name="confirm_password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirm_password}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('confirm_password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Confirm"
                      required
                      className={`w-full bg-transparent rounded-xl pr-10 pl-4 py-3 text-sm outline-none transition-colors ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Show Password Toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <svg className={`w-3.5 h-3.5 ${showPassword ? 'text-accent-blue' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
                {showPassword ? 'Hide passwords' : 'Show passwords'}
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={loading || !systemConfig.allowRegistrations}
              whileHover={!loading && systemConfig.allowRegistrations ? { scale: 1.01 } : {}}
              whileTap={!loading && systemConfig.allowRegistrations ? { scale: 0.99 } : {}}
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
                  Creating Account...
                </span>
              ) : !systemConfig.allowRegistrations ? (
                'Registration Disabled'
              ) : (
                'Create Account'
              )}
            </motion.button>

            <p className={`text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Already have an account?{' '}
              <Link to="/login" className={`font-medium transition-colors ${
                isDark ? 'text-accent-blue hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}>
                Sign In
              </Link>
            </p>
          </motion.form>
        </AuthCard>
      </div>
    </div>
  )
}
