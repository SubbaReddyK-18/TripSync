import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from './stores/authStore'
import useUiStore from './stores/uiStore'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TripsPage from './pages/TripsPage'
import TripOverviewPage from './pages/TripOverviewPage'
import ExpensesPage from './pages/ExpensesPage'
import SettlementsPage from './pages/SettlementsPage'
import BudgetPage from './pages/BudgetPage'
import MemoriesPage from './pages/MemoriesPage'
import ItineraryPage from './pages/ItineraryPage'
import PlacesPage from './pages/PlacesPage'
import SettingsPage from './pages/SettingsPage'
import ActivityHistoryPage from './pages/ActivityHistoryPage'
import AdminActivityLogsPage from './pages/AdminActivityLogsPage'
import AdminConfigPage from './pages/AdminConfigPage'
import AdminUserManagementPage from './pages/AdminUserManagementPage'
import OtpVerificationPage from './pages/OtpVerificationPage'
import { connectSocket, disconnectSocket, joinTripRoom, leaveTripRoom, onTripEvent, offTripEvent, getSocket } from './services/socket'
import toast from 'react-hot-toast'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-primary"><div className="text-accent-green text-lg">Loading...</div></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function ModuleGuard({ moduleKey, children }) {
  const { systemConfig } = useUiStore()
  if (!systemConfig[moduleKey]) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function WelcomeOverlay() {
  const { showWelcome, dismissWelcome, user } = useAuthStore()
  const [visible, setVisible] = useState(false)
  const [stars, setStars] = useState([])

  useEffect(() => {
    if (showWelcome) {
      const generated = Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 55}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 2 + 1,
        delay: `${Math.random() * 4}s`,
        duration: `${2 + Math.random() * 3}s`,
      }))
      setStars(generated)

      requestAnimationFrame(() => setVisible(true))
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(() => dismissWelcome(), 600)
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [showWelcome])

  if (!showWelcome) return null

  const currentHour = new Date().getHours()
  const isNight = currentHour >= 18 || currentHour < 6

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden select-none"
        >
          {/* Deep Sunset/Midnight Sky Background */}
          <div 
            className={`absolute inset-0 transition-colors duration-1000 overflow-hidden ${
              isNight 
                ? 'bg-gradient-to-b from-[#010103] via-[#050616] to-[#0f0b20]' 
                : 'bg-gradient-to-b from-[#030712] via-[#0b0c22] to-[#21143c]'
            }`}
          >
            {/* Twinkling Stars */}
            {stars.map((star) => (
              <div
                key={star.id}
                className="absolute bg-white rounded-full animate-pulse"
                style={{
                  top: star.top,
                  left: star.left,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  animationDelay: star.delay,
                  animationDuration: star.duration,
                  opacity: isNight ? 0.45 : 0.25,
                }}
              />
            ))}

            {/* Floating Atmospheric Clouds */}
            <div className="absolute top-[15%] left-[-10%] w-[40%] h-[120px] bg-gradient-to-r from-purple-900/20 via-pink-900/10 to-transparent blur-2xl rounded-full animate-float" style={{ animationDuration: '20s' }} />
            <div className="absolute top-[35%] right-[-15%] w-[50%] h-[150px] bg-gradient-to-l from-indigo-900/20 via-purple-900/10 to-transparent blur-2xl rounded-full animate-float-reverse" style={{ animationDuration: '25s' }} />

            {/* Large Glowing Sun/Moon rising */}
            {isNight ? (
              /* Cool Silver Moon (Softer brightness, not too white, no stress) */
              <div 
                className="absolute left-1/2 bottom-[25%] -translate-x-1/2 w-[220px] h-[220px] sm:w-[320px] sm:h-[320px] rounded-full bg-gradient-to-b from-[#cbd5e1] via-[#94a3b8] to-[#64748b] shadow-[0_0_50px_rgba(148,163,184,0.25),0_0_100px_rgba(100,116,139,0.12)] animate-sun-rise"
              />
            ) : (
              /* Warm Golden Sun */
              <div 
                className="absolute left-1/2 bottom-[25%] -translate-x-1/2 w-[220px] h-[220px] sm:w-[320px] sm:h-[320px] rounded-full bg-gradient-to-b from-[#ffe58f] via-[#ff9c6e] to-[#ff4d4f] shadow-[0_0_120px_#ff9c6e,0_0_240px_rgba(255,77,79,0.45)] animate-sun-rise"
              />
            )}

            {/* Layered Mountains (SVG) */}
            <svg 
              className="absolute bottom-0 left-0 w-full h-[55%] min-h-[300px] select-none pointer-events-none" 
              viewBox="0 0 1440 600" 
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="backMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isNight ? "#0d0e20" : "#4c1d95"} />
                  <stop offset="40%" stopColor={isNight ? "#060714" : "#2e1065"} />
                  <stop offset="100%" stopColor={isNight ? "#010208" : "#0c0422"} />
                </linearGradient>
                <linearGradient id="midMountainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isNight ? "#060714" : "#1e1b4b"} stopOpacity="0.95" />
                  <stop offset="50%" stopColor={isNight ? "#03040c" : "#311059"} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={isNight ? "#010105" : "#080214"} />
                </linearGradient>
                <linearGradient id="frontMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isNight ? "#020306" : "#090514"} />
                  <stop offset="100%" stopColor="#000000" />
                </linearGradient>
              </defs>

              {/* Back Mountain Layer */}
              <path 
                d="M0,280 Q250,150 550,260 T1100,220 T1440,290 L1440,600 L0,600 Z" 
                fill="url(#backMountainGrad)" 
                opacity="0.85"
                className="animate-mountain-shift"
              />

              {/* Mid Mountain Layer */}
              <path 
                d="M0,380 C360,260 720,440 1080,320 C1200,280 1320,320 1440,360 L1440,600 L0,600 Z" 
                fill="url(#midMountainGrad)"
                opacity="0.95"
                className="animate-mountain-shift-delayed"
              />

              {/* Front Mountain Layer */}
              <path 
                d="M0,480 Q320,390 720,490 T1440,440 L1440,600 L0,600 Z" 
                fill="url(#frontMountainGrad)"
              />
            </svg>

            {/* Shadow cover at the absolute bottom */}
            <div className="absolute bottom-0 left-0 w-full h-[10%] bg-gradient-to-t from-[#010103] to-transparent pointer-events-none" />
          </div>

          {/* Text Content */}
          <div className="relative z-10 text-center px-4 max-w-2xl w-full select-none">

            {/* Main greeting */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1
                className={`font-cursive font-normal leading-tight text-ribbon-gradient animate-pulse-glow py-4 drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] ${
                  user?.role === 'admin' ? 'text-[clamp(2.2rem,6.5vw,3.8rem)] whitespace-nowrap' : 'text-[clamp(3.2rem,9vw,5.5rem)]'
                }`}
              >
                {user?.role === 'admin' 
                  ? (user?.is_first_login ? 'Welcome Admin' : 'Welcome Back Admin') 
                  : (user?.is_first_login ? 'Welcome' : 'Welcome Back')}
              </h1>
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className={`text-xs sm:text-sm font-bold tracking-[0.25em] uppercase font-body mt-2 animate-fade-in drop-shadow-[0_4px_12px_rgba(0,0,0,0.99)] ${
                isNight ? 'text-slate-300' : 'text-white'
              }`}
            >
              {user?.role === 'admin' ? 'Control Center' : 'Your Travel Journey Awaits'}
            </motion.p>

            {/* Decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-px mx-auto mt-10 w-16"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const EVENT_TOAST = {
  expense_added: { msg: 'New expense added', icon: '💵' },
  expense_updated: { msg: 'Expense updated', icon: '✏️' },
  expense_deleted: { msg: 'Expense deleted', icon: '🗑️' },
  budget_updated: { msg: 'Budget updated', icon: '📊' },
  memory_added: { msg: 'New memory added', icon: '📸' },
  memory_deleted: { msg: 'Memory deleted', icon: '🗑️' },
  comment_added: { msg: 'New comment', icon: '💬' },
  comment_deleted: { msg: 'Comment deleted', icon: '🗑️' },
  itinerary_added: { msg: 'New itinerary item', icon: '📅' },
  itinerary_deleted: { msg: 'Itinerary item deleted', icon: '🗑️' },
  location_added: { msg: 'New place added', icon: '📍' },
  location_deleted: { msg: 'Place removed', icon: '🗑️' },
  settlements_updated: { msg: 'Settlements updated', icon: '💰' },
  member_joined: { msg: 'New member joined', icon: '👋' },
  member_left: { msg: 'Member left', icon: '👋' },
}

function SocketManager() {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()
  const [currentTripId, setCurrentTripId] = useState(null)

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      const token = localStorage.getItem('access_token')
      connectSocket(token)
    }
    return () => { disconnectSocket() }
  }, [isAuthenticated, user?.role])

  useEffect(() => {
    if (!isAuthenticated || user?.role === 'admin') return
    const match = location.pathname.match(/\/trips\/([a-f0-9]+)/)
    const tripId = match ? match[1] : null

    if (tripId && tripId !== currentTripId) {
      if (currentTripId) leaveTripRoom(currentTripId)
      joinTripRoom(tripId)
      setCurrentTripId(tripId)
    } else if (!tripId && currentTripId) {
      leaveTripRoom(currentTripId)
      setCurrentTripId(null)
    }
  }, [location.pathname, isAuthenticated, user?.role])

  useEffect(() => {
    if (!isAuthenticated || user?.role === 'admin') return

    const handlers = {}
    const events = Object.keys(EVENT_TOAST)
    events.forEach((event) => {
      handlers[event] = (data) => {
        const { msg, icon } = EVENT_TOAST[event]
        toast(`${icon} ${msg}`, { duration: 3000, position: 'bottom-right' })
      }
      onTripEvent(event, handlers[event])
    })

    return () => {
      events.forEach((event) => {
        offTripEvent(event, handlers[event])
      })
    }
  }, [isAuthenticated, user?.role])

  return null
}

export default function App() {
  const { fetchUser, isAuthenticated, user } = useAuthStore()
  const { initTheme, setSystemConfig } = useUiStore()

  useEffect(() => {
    initTheme()
    if (localStorage.getItem('access_token')) {
      fetchUser()
    } else {
      useAuthStore.setState({ isLoading: false })
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      import('./api/admin').then(({ getSystemConfig }) => {
        getSystemConfig().then(({ data }) => setSystemConfig(data.data)).catch(() => {})
      })
    }
  }, [isAuthenticated])

  return (
    <>
      <WelcomeOverlay />
      <SocketManager />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/verify-otp" element={<OtpVerificationPage />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/activity" element={<ActivityHistoryPage />} />
          <Route path="/trips/:tripId" element={<TripOverviewPage />} />
          <Route path="/trips/:tripId/expenses" element={<ExpensesPage />} />
          <Route path="/trips/:tripId/settlements" element={<ModuleGuard moduleKey="enableSettlements"><SettlementsPage /></ModuleGuard>} />
          <Route path="/trips/:tripId/budget" element={<BudgetPage />} />
          <Route path="/trips/:tripId/memories" element={<ModuleGuard moduleKey="enableMemories"><MemoriesPage /></ModuleGuard>} />
          <Route path="/trips/:tripId/itinerary" element={<ItineraryPage />} />
          <Route path="/trips/:tripId/places" element={<ModuleGuard moduleKey="enablePlaces"><PlacesPage /></ModuleGuard>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin/users" element={<AdminUserManagementPage />} />
          <Route path="/admin/activity-logs" element={<AdminActivityLogsPage />} />
          <Route path="/admin/config" element={<AdminConfigPage />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  )
}
