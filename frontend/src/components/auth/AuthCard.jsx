export default function AuthCard({ isDark, children, className = '' }) {
  return (
    <div className="w-full lg:w-[40%] flex items-center justify-center px-6 lg:px-10 xl:px-14 py-6 lg:py-12 relative z-10">
      <div className={`w-full max-w-[420px] ${className}`}>
        <div className={`
          relative overflow-hidden
          rounded-[24px] p-8 sm:p-10
          transition-all duration-500
          ${isDark
            ? 'bg-[rgba(15,23,42,0.7)] border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
            : 'bg-[rgba(255,255,255,0.75)] border border-[rgba(255,255,255,0.8)] shadow-[0_8px_32px_rgba(0,0,0,0.06)]'
          }
          backdrop-blur-[20px] backdrop-saturate-[1.8]
          [-webkit-backdrop-filter:blur(20px)_saturate(1.8)]
        `}>
          {/* Subtle ambient glow inside card */}
          <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${
            isDark ? 'bg-accent-blue/[0.04]' : 'bg-blue-400/10'
          }`} />
          <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${
            isDark ? 'bg-accent-indigo/[0.04]' : 'bg-indigo-400/10'
          }`} />

          <div className="relative z-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
