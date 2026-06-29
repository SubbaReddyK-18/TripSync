export const you = (currentUserId, userId, fallback) => {
  if (!userId) return fallback || 'Someone'
  if (currentUserId && userId === currentUserId) return 'You'
  return fallback || userId
}

export const youName = (currentUserId, user) => {
  if (!user) return 'Someone'
  if (typeof user === 'string') return user.slice(-6)
  if (currentUserId && user._id === currentUserId) return 'You'
  return user.full_name || user.username || user._id?.slice(-6) || 'Someone'
}
