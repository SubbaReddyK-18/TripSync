import { NavLink, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import useUiStore from '../../stores/uiStore'
import useAuthStore from '../../stores/authStore'
import Logo from './Logo'
import Avatar from '../common/Avatar'

const mainLinks = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    to: '/trips',
    label: 'My Trips',
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
    admin: false,
  },
]

const tripLinks = [
  { to: '', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: 'expenses', label: 'Expenses', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: 'settlements', label: 'Settlements', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { to: 'budget', label: 'Budget', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: 'memories', label: 'Memories', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: 'itinerary', label: 'Itinerary', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: 'places', label: 'Places', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z' },
]

const adminLinks = [
  { to: '/admin/users', label: 'User Management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { to: '/admin/activity-logs', label: 'Activity Logs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to: '/admin/config', label: 'System Config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

function NavItem({ to, label, icon, end, isDark }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? isDark ? 'text-accent-indigo' : 'text-accent-indigo'
            : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Left indicator line */}
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-accent-indigo"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className={`relative z-10 flex items-center gap-3 ml-1 ${isActive ? 'font-bold' : ''}`}>
            <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
            <span className="relative z-10">{label}</span>
          </span>
          {isActive && (
            <span className={`absolute inset-0 rounded-xl transition-all duration-200 ${
              isDark ? 'bg-white/[0.04]' : 'bg-indigo-50/60'
            }`} />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, systemConfig, isDark } = useUiStore()
  const { user } = useAuthStore()
  const { tripId } = useParams()

  const filteredTripLinks = tripLinks.filter((link) => {
    if (link.label === 'Expenses' && !systemConfig.enableExpenses) return false
    if (link.label === 'Settlements' && !systemConfig.enableSettlements) return false
    if (link.label === 'Memories' && !systemConfig.enableMemories) return false
    if (link.label === 'Places' && !systemConfig.enablePlaces) return false
    return true
  })

  return (
    <>
      {/* Hover detection strip */}
      {!sidebarOpen && (
        <div
          className="fixed left-0 top-0 h-full w-[5px] z-40 bg-transparent cursor-pointer"
          onMouseEnter={() => setSidebarOpen(true)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
        onMouseLeave={() => setSidebarOpen(false)}
        style={{
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        {/* Logo — style #2: theme-aware trolley suitcase */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <Logo size="sm" variant="icon-only" isDark={isDark} isAdmin={user?.role === 'admin'} />
            <div>
              <h2 className="text-base font-bold font-heading" style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                <span style={{ 
                  color: user?.role === 'admin'
                    ? isDark ? '#A5B4FC' : '#3730A3'
                    : isDark ? '#4F9CFB' : '#1E2B5A'
                }}>Trip</span>
                <span 
                  className="bg-clip-text text-transparent inline-block"
                  style={{
                    backgroundImage: user?.role === 'admin'
                      ? isDark ? 'linear-gradient(135deg, #A5B4FC, #67E8F9)' : 'linear-gradient(135deg, #6366F1, #4F9CFB)'
                      : isDark ? 'linear-gradient(135deg, #2DD4BF, #4F9CFB)' : 'linear-gradient(135deg, #14B8A6, #2563EB)',
                  }}
                >
                  Sync
                </span>
              </h2>
              <p className={`text-[10px] font-medium tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Travel Manager</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {/* Main */}
          <div className="mb-4">
            <p className={`px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Main</p>
            {mainLinks.map((link) => {
              if (link.admin === false && user?.role === 'admin') return null
              if (link.admin === true && user?.role !== 'admin') return null
              return <NavItem key={link.to} to={link.to} label={link.label} icon={link.icon} end isDark={isDark} />
            })}
          </div>

          {/* Trip Section */}
          {tripId && (
            <div className="mb-4">
              <p className={`px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Trip</p>
              {filteredTripLinks.map((link) => (
                <NavItem
                  key={link.to}
                  to={`/trips/${tripId}/${link.to}`}
                  label={link.label}
                  icon={link.icon}
                  end={link.to === ''}
                  isDark={isDark}
                />
              ))}
            </div>
          )}

          {/* Admin */}
          {user?.role === 'admin' && (
            <div className="mb-4">
              <p className={`px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Admin</p>
              {adminLinks.map((link) => (
                <NavItem key={link.to} to={link.to} label={link.label} icon={link.icon} isDark={isDark} />
              ))}
            </div>
          )}

          {/* Settings */}
          <div>
            <p className={`px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Account</p>
            <NavItem to="/settings" label="Settings" icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" isDark={isDark} />
          </div>
        </nav>

        {/* Bottom profile */}
        <div className={`shrink-0 px-3 py-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl">
            <Avatar user={user} size="sm" shape="rounded" />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{user?.full_name || user?.username}</p>
              <p className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
