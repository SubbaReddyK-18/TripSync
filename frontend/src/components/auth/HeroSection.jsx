import { useState, useEffect } from 'react'
import Logo from '../layout/Logo'

const FEATURES = [
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    label: 'Collaborative Trip Planning',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    label: 'Smart Expense Splitting',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    label: 'Shared Travel Memories',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 010 4h14v5a2 2 0 01-2 2H5" />
        <path d="M3 5v14" />
      </svg>
    ),
    label: 'Settlement Tracking',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    label: 'Place Discovery',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    label: 'Real-time Updates',
  },
]

const ADMIN_FEATURES = [
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    label: 'User Management',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    label: 'Trip Management',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    label: 'Platform Analytics',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: 'Secure Administration',
  },
]

export default function HeroSection({ mode = 'login', isDark, portal = 'user' }) {
  const isLogin = mode === 'login'
  const isAdmin = portal === 'admin'
  const trustData = { users: '4+', trips: '1+', auth: '100% Secure' }
  const adminTagline = ['Manage.', 'Monitor.', 'Control.']
  const userTagline = ['Plan.', 'Travel.', 'Remember.']
  const regTagline = ['Create.', 'Travel.', 'Share.']
  const tagline = isAdmin ? adminTagline : isLogin ? userTagline : regTagline

  return (
    <div className="w-full lg:w-[60%] flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-6 lg:py-12 relative z-10">
      <Logo size="lg" isDark={isDark} isAdmin={isAdmin} className="mb-4 lg:mb-16" />


      {/* Hero Typography - Apple-style hierarchy */}
      <div className="mb-4 lg:mb-14">
        <h1 className={`font-heading font-bold leading-[1.05] tracking-[-0.03em] mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
          style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}>
          {tagline[0]}
        </h1>
        <h2 className={`font-heading font-semibold leading-[1.1] tracking-[-0.02em] mb-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
          style={{ fontSize: 'clamp(2.4rem, 5vw, 4.2rem)' }}>
          {tagline[1]}
        </h2>
        <h3 className={`font-heading font-medium leading-[1.15] tracking-[-0.01em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
          style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
          {tagline[2]}
        </h3>
      </div>



      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-4 lg:mb-12 max-w-lg">
        {(isAdmin ? ADMIN_FEATURES : FEATURES).map((feature, i) => (
          <div
            key={i}
            className={`group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 cursor-default ${isDark
                ? 'hover:bg-white/[0.04]'
                : 'hover:bg-slate-900/[0.03]'
              }`}
          >
            <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${isDark
                ? isAdmin
                  ? 'text-accent-indigo bg-accent-indigo/10 group-hover:bg-accent-indigo/15'
                  : 'text-accent-blue bg-accent-blue/10 group-hover:bg-accent-blue/15'
                : isAdmin
                  ? 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100'
                  : 'text-blue-600 bg-blue-50 group-hover:bg-blue-100'
              }`}>
              {feature.icon}
            </span>
            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {feature.label}
            </span>
          </div>
        ))}
      </div>


    </div>
  )
}
