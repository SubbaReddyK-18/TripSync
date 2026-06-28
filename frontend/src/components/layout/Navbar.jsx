import { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'
import useUiStore from '../../stores/uiStore'
import useTripStore from '../../stores/tripStore'
import { searchUsers } from '../../api/users'
import { motion } from 'framer-motion'
import Avatar from '../common/Avatar'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/trips': 'My Trips',
  '/settings': 'Settings',
  '/admin/users': 'User Management',
  '/admin/activity-logs': 'Activity Logs',
  '/admin/config': 'System Config',
}

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { toggleSidebar, setSidebarOpen, isDark, toggleTheme } = useUiStore()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdminPage = location.pathname.startsWith('/admin')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ trips: [], users: [] })
  const [searching, setSearching] = useState(false)
  const { trips } = useTripStore()

  useEffect(() => {
    if (!searchOpen) { setSearchQuery(''); setSearchResults({ trips: [], users: [] }); return }
    if (!searchQuery.trim()) { setSearchResults({ trips: [], users: [] }); return }

    const q = searchQuery.toLowerCase().trim()
    const timer = setTimeout(async () => {
      setSearching(true)
      const filteredTrips = trips.filter(t => (t.title || '').toLowerCase().includes(q) || (t.destination || '').toLowerCase().includes(q))

      let users = []
      try { const { data } = await searchUsers(q); users = data.data?.users || [] } catch {}

      setSearchResults({ trips: filteredTrips.slice(0, 5), users: users.slice(0, 5) })
      setSearching(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery, searchOpen])

  // Get page title
  const getPageTitle = () => {
    // Check exact match
    const exact = PAGE_TITLES[location.pathname]
    if (exact) return exact

    // Check trip pages
    const tripMatch = location.pathname.match(/\/trips\/([a-f0-9]+)/)
    if (tripMatch) return 'Trip Overview'
    if (location.pathname.match(/\/trips\/([a-f0-9]+)\/expenses/)) return 'Expenses'
    if (location.pathname.match(/\/trips\/([a-f0-9]+)\/settlements/)) return 'Settlements'
    if (location.pathname.match(/\/trips\/([a-f0-9]+)\/budget/)) return 'Budget'
    if (location.pathname.match(/\/trips\/([a-f0-9]+)\/itinerary/)) return 'Itinerary'
    if (location.pathname.match(/\/trips\/([a-f0-9]+)\/places/)) return 'Places'

    return 'Dashboard'
  }

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <nav
      className="h-16 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-40"
      style={{
        backgroundColor: 'var(--color-primary)',
        borderBottom: '1px solid var(--color-border)',
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Left: Menu + Title */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={toggleSidebar}
          onMouseEnter={() => setSidebarOpen(true)}
          className="text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-primary-lighter transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-heading font-bold text-text-primary truncate">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Center: Search (hidden on admin pages) */}
      {!isAdminPage && (
      <div className="hidden md:block flex-1 max-w-md mx-8">
        <button
          onClick={() => setSearchOpen(true)}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-all duration-300 ${
            isDark
              ? 'bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:border-white/[0.1]'
              : 'bg-slate-100/70 border border-slate-200/60 text-slate-400 hover:bg-slate-200/50 hover:border-slate-300/60'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="font-medium">Search trips, users...</span>
          <kbd className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border ${
            isDark ? 'text-slate-500 border-white/[0.08] bg-white/[0.03]' : 'text-slate-400 border-slate-200 bg-white/50'
          }`}>
            ⌘K
          </kbd>
        </button>
      </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isDark
              ? 'text-yellow-400 hover:bg-white/[0.06]'
              : 'text-slate-500 hover:bg-slate-100'
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





        {/* Logout */}
        <motion.button
          onClick={logout}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isDark ? 'hover:bg-white/[0.06] text-slate-400 hover:text-red-400' : 'hover:bg-slate-100 text-slate-400 hover:text-red-500'
          }`}
          title="Logout"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </motion.button>
      </div>

      {/* Search Modal (hidden on admin pages) */}
      {!isAdminPage && searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] p-4"
          onClick={() => { setSearchOpen(false); setSearchQuery('') }}
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl ${
              isDark ? 'bg-[#111827] border border-white/[0.08]' : 'bg-white border border-slate-200'
            }`}
          >
            <div className={`flex items-center gap-3 px-5 py-4 border-b ${
              isDark ? 'border-white/[0.06]' : 'border-slate-100'
            }`}>
              <svg className={`w-5 h-5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trips, users..."
                autoFocus
                className={`flex-1 bg-transparent text-sm outline-none ${
                  isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                }`}
              />
              <kbd className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isDark ? 'text-slate-500 bg-white/[0.04] border border-white/[0.06]' : 'text-slate-400 bg-slate-100 border border-slate-200'
              }`}>
                ESC
              </kbd>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {!searchQuery.trim() ? (
                <div className="px-5 py-8 text-center">
                  <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Type to search across all trips and users
                  </p>
                </div>
              ) : searching ? (
                <div className="px-5 py-8 text-center">
                  <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <div className="py-2 space-y-0.5">
                  {searchResults.trips.length > 0 && (
                    <>
                      <p className={`px-5 py-2 text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Trips
                      </p>
                      {searchResults.trips.map((t) => (
                        <button
                          key={t._id}
                          onClick={() => { navigate(`/trips/${t._id}`); setSearchOpen(false); setSearchQuery('') }}
                          className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                            isDark ? 'hover:bg-white/[0.04] text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="text-base shrink-0">✈️</span>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-medium truncate">{t.title}</p>
                            {t.destination && <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.destination}</p>}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {searchResults.users.length > 0 && (
                    <>
                      <p className={`px-5 py-2 text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Users
                      </p>
                      {searchResults.users.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                          className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                            isDark ? 'hover:bg-white/[0.04] text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Avatar user={u} size="sm" shape="rounded" />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-medium truncate">{u.full_name || u.username}</p>
                            <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>@{u.username}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {searchResults.trips.length === 0 && searchResults.users.length === 0 && (
                    <div className="px-5 py-8 text-center">
                      <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        No results found for "{searchQuery}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </nav>
  )
}
