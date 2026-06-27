export default function Avatar({ user, size = 'sm', className = '', shape = 'circle', bg = 'from-accent-indigo to-accent-purple' }) {
  const sizeClasses = {
    xs: 'w-5 h-5 text-[8px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-lg',
  }
  const cls = sizeClasses[size] || sizeClasses.sm
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg'

  if (user?.profile_photo_url) {
    return (
      <img
        src={user.profile_photo_url}
        alt=""
        className={`${cls} ${shapeClass} object-cover ring-2 ring-border shrink-0 ${className}`}
      />
    )
  }

  return (
    <div className={`${cls} ${shapeClass} bg-gradient-to-br ${bg} flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${className}`}>
      {user?.full_name?.charAt(0) || user?.username?.charAt(0) || '?'}
    </div>
  )
}
