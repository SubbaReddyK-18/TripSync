import React from 'react'

export default function Logo({
  variant = 'horizontal', // 'horizontal' | 'icon-only'
  theme = 'dynamic',      // 'light' | 'dark' | 'dynamic'
  isDark = false,         // Fallback if dynamic
  isAdmin = false,        // Use admin colors if true
  monochrome = false,     // Render in a single color
  size = 'md',            // 'sm' | 'md' | 'lg' | 'xl'
  className = ''
}) {
  // Determine if we should render dark theme
  const renderDark = theme === 'dark' || (theme === 'dynamic' && isDark)

  // Sizing definitions
  const sizes = {
    sm: { iconWidth: 32, iconHeight: 38, fontSize: '18px', gap: '6px' },
    md: { iconWidth: 46, iconHeight: 55, fontSize: '26px', gap: '8px' },
    lg: { iconWidth: 72, iconHeight: 86, fontSize: '42px', gap: '10px' },
    xl: { iconWidth: 100, iconHeight: 120, fontSize: '56px', gap: '14px' }
  }

  const currentSize = sizes[size] || sizes.md

  // Color Definitions
  // Outline, wheels, handle, front mountain
  const primaryNavy = '#1E2B5A'
  const primaryBlue = '#2563EB'
  const skyBlue = '#4F9CFB'
  const teal = '#2DD4BF'
  const darkBlue = '#1E3A8A'
  
  // Outer suitcase styling based on mode
  let outerStroke = primaryNavy
  let outerFill = '#FFFFFF'
  let frontMountainFill = primaryNavy
  let riverStroke = '#FFFFFF'
  
  if (monochrome) {
    outerStroke = 'currentColor'
    outerFill = 'none'
    frontMountainFill = 'currentColor'
    riverStroke = 'none'
  } else if (renderDark) {
    // Premium dark theme version: sky blue suitcase outline, deep dark background
    outerStroke = skyBlue
    outerFill = '#111827' // Dark gray/navy background inside suitcase
    frontMountainFill = primaryNavy
    riverStroke = teal
  }

  // Pin & Mountain gradient stops
  const pinGradStart = monochrome ? 'currentColor' : skyBlue
  const pinGradEnd = monochrome ? 'currentColor' : primaryBlue

  const mountainLeftStart = monochrome ? 'currentColor' : primaryBlue
  const mountainLeftEnd = monochrome ? 'currentColor' : skyBlue

  const mountainRightStart = monochrome ? 'currentColor' : skyBlue
  const mountainRightEnd = monochrome ? 'currentColor' : darkBlue

  // Typography text colors matching the theme
  let tripColor = '#1E2B5A'
  if (monochrome) {
    tripColor = 'currentColor'
  } else if (isAdmin) {
    tripColor = renderDark ? '#A5B4FC' : '#3730A3'
  } else {
    tripColor = renderDark ? '#4F9CFB' : '#1E2B5A'
  }

  // Dynamic Sync text gradient based on theme & portal
  let syncGradFrom = '#14B8A6'
  let syncGradTo = '#2563EB'

  if (monochrome) {
    syncGradFrom = 'currentColor'
    syncGradTo = 'currentColor'
  } else if (isAdmin) {
    if (renderDark) {
      syncGradFrom = '#A5B4FC' // Light Indigo
      syncGradTo = '#67E8F9'   // Neon Cyan
    } else {
      syncGradFrom = '#6366F1' // Indigo
      syncGradTo = '#4F9CFB'   // Sky Blue
    }
  } else {
    if (renderDark) {
      syncGradFrom = '#2DD4BF' // Bright Teal
      syncGradTo = '#4F9CFB'   // Sky Blue
    } else {
      syncGradFrom = '#14B8A6' // Teal
      syncGradTo = '#2563EB'   // Primary Blue
    }
  }

  // Unique IDs to avoid conflicts when rendering multiple SVG instances
  const idPrefix = `${variant}-${theme}-${isAdmin ? 'admin' : 'user'}-${isDark ? 'dark' : 'light'}-${monochrome ? 'mono' : 'color'}`
  const pinGradId = `${idPrefix}-pin-grad`
  const mtLeftGradId = `${idPrefix}-mt-left-grad`
  const mtRightGradId = `${idPrefix}-mt-right-grad`
  const suitcaseClipId = `${idPrefix}-suitcase-clip`

  const svgIcon = (
    <svg 
      width={currentSize.iconWidth} 
      height={currentSize.iconHeight} 
      viewBox="0 0 100 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        {/* Pin gradient */}
        <linearGradient id={pinGradId} x1="50" y1="31" x2="50" y2="59" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={pinGradStart} />
          <stop offset="100%" stopColor={pinGradEnd} />
        </linearGradient>

        {/* Left Mountain gradient */}
        <linearGradient id={mtLeftGradId} x1="38" y1="67" x2="15" y2="106" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={mountainLeftStart} />
          <stop offset="100%" stopColor={mountainLeftEnd} />
        </linearGradient>

        {/* Right Mountain gradient */}
        <linearGradient id={mtRightGradId} x1="62" y1="60" x2="85" y2="106" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={mountainRightStart} />
          <stop offset="100%" stopColor={mountainRightEnd} />
        </linearGradient>

        {/* Precise clip path inside the suitcase body outline */}
        <clipPath id={suitcaseClipId}>
          <rect x="17.75" y="25.75" width="64.5" height="76.5" rx="11.25" />
        </clipPath>
      </defs>

      {/* 1. Handle (top center) */}
      <rect 
        x="36" 
        y="10" 
        width="28" 
        height="15" 
        rx="5" 
        stroke={outerStroke} 
        strokeWidth="5.5" 
        strokeLinejoin="round" 
        fill="none" 
      />

      {/* 2. Wheels (bottom) */}
      <rect x="30" y="103" width="8" height="8" rx="4" fill={outerStroke} />
      <rect x="62" y="103" width="8" height="8" rx="4" fill={outerStroke} />

      {/* 3. Suitcase Body */}
      <rect 
        x="15" 
        y="23" 
        width="70" 
        height="82" 
        rx="14" 
        stroke={outerStroke} 
        strokeWidth="5.5" 
        strokeLinejoin="round" 
        fill={outerFill} 
      />

      {/* 4. Layered Mountains and Path (Clipped) */}
      <g clipPath={`url(#${suitcaseClipId})`}>
        {/* Back Mountain Left */}
        <path 
          d="M 10 106 L 38 67 L 66 106 Z" 
          fill={`url(#${mtLeftGradId})`} 
          fillOpacity={monochrome ? '0.3' : '1'}
        />

        {/* Back Mountain Right */}
        <path 
          d="M 34 106 L 62 60 L 90 106 Z" 
          fill={`url(#${mtRightGradId})`} 
          fillOpacity={monochrome ? '0.5' : '0.9'}
        />

        {/* Front Mountain Silhouette (Dark Navy or Monochrome) */}
        <path 
          d="M 10 106 L 15 88 L 28 80 L 42 88 L 56 75 L 70 86 L 85 80 L 90 106 Z" 
          fill={frontMountainFill} 
          fillOpacity={monochrome ? '0.7' : '1'}
        />

        {/* Journey Path (Road/River) */}
        {riverStroke !== 'none' && (
          <path 
            d="M 56 77 Q 59 90 78 106" 
            stroke={riverStroke} 
            strokeWidth="3" 
            strokeLinecap="round" 
            fill="none" 
          />
        )}
      </g>

      {/* 5. Location Pin */}
      <g>
        <path 
          d="M 50 31 C 44.5 31, 40 35.5, 40 41 C 40 49, 50 59, 50 59 C 50 59, 60 49, 60 41 C 60 35.5, 55.5 31, 50 31 Z" 
          fill={`url(#${pinGradId})`} 
        />
        <circle cx="50" cy="41" r="3.5" fill={monochrome ? 'none' : '#FFFFFF'} />
      </g>
    </svg>
  )

  if (variant === 'icon-only') {
    return svgIcon
  }

  return (
    <div className={`flex items-center ${className}`} style={{ gap: currentSize.gap }}>
      {svgIcon}
      <h2 
        className="font-bold tracking-tight select-none font-heading" 
        style={{ 
          fontSize: currentSize.fontSize, 
          letterSpacing: '-0.02em', 
          lineHeight: 1 
        }}
      >
        <span style={{ color: tripColor }}>Trip</span>
        <span 
          className={monochrome ? "" : "bg-clip-text text-transparent inline-block"}
          style={
            monochrome 
              ? { color: 'currentColor' } 
              : {
                  backgroundImage: `linear-gradient(135deg, ${syncGradFrom}, ${syncGradTo})`
                }
          }
        >
          Sync
        </span>
      </h2>
    </div>
  )
}
