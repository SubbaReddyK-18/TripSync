import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import * as dashboardApi from '../api/dashboard'
import { you } from '../utils/displayName'

const ACTIVITY_ICONS = {
  expense_added: '💳',
  expense_updated: '✏️',
  expense_deleted: '🗑️',
  settlement_completed: '💰',
  settlement_updated: '💰',
  memory_added: '📸',
  memory_deleted: '🗑️',
  place_added: '📍',
  place_deleted: '🗑️',
  itinerary_added: '📅',
  itinerary_deleted: '🗑️',
  trip_created: '🗺️',
  trip_updated: '🗺️',
  member_joined: '👥',
  member_left: '👋',
  invitation_accepted: '✅',
  invitation_sent: '📨',
  budget_updated: '📊',
  comment_added: '💬',
}

function getActivityIcon(actionType, description) {
  const key = Object.keys(ACTIVITY_ICONS).find(k => actionType?.toLowerCase().includes(k))
  if (key) return ACTIVITY_ICONS[key]
  const desc = (description || '').toLowerCase()
  if (desc.includes('expense')) return '💳'
  if (desc.includes('settlement') || desc.includes('settled')) return '💰'
  if (desc.includes('memory') || desc.includes('photo') || desc.includes('upload')) return '📸'
  if (desc.includes('place') || desc.includes('location')) return '📍'
  if (desc.includes('member') || desc.includes('joined') || desc.includes('left')) return '👥'
  if (desc.includes('trip') && (desc.includes('create') || desc.includes('update'))) return '🗺️'
  if (desc.includes('invitation') || desc.includes('invite') || desc.includes('accepted')) return '✅'
  if (desc.includes('budget')) return '📊'
  if (desc.includes('comment')) return '💬'
  return '📌'
}

function getTimeAgo(dateStr) {
  const d = dateStr ? new Date(dateStr) : null
  if (!d || isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

export default function ActivityHistoryPage() {
  const { user } = useAuthStore()
  const { isDark } = useUiStore()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    dashboardApi.getAllActivity(100, 'all')
      .then(({ data }) => setActivities(data.data.activities || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-heading font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Activity History
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Track all your actions across trips, expenses, and more.
          </p>
        </div>
        <Link
          to="/dashboard"
          className={`text-xs font-medium transition-colors ${isDark ? 'text-accent-blue hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
        >
          ← Back to Dashboard
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-white/[0.15]' : 'border-slate-300'}`} />
        </div>
      ) : activities.length === 0 ? (
        <div className={`text-center py-20 rounded-2xl border-2 border-dashed ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
            📋
          </div>
          <h3 className={`text-base font-heading font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>No activity yet</h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Your actions will appear here as you use TripSync.</p>
        </div>
      ) : (
        <div className={`rounded-2xl overflow-hidden transition-colors ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {activities.map((act, idx) => (
              <motion.div
                key={act._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`flex items-start gap-4 px-6 py-4 ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}`}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-200/50 dark:border-white/10 shadow-sm">
                    {act.actor?.profile_photo_url ? (
                      <img 
                        src={act.actor.profile_photo_url} 
                        alt={act.actor?.full_name || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase">
                        {act.actor?.full_name ? act.actor.full_name.charAt(0) : 'U'}
                      </span>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 text-xs bg-white dark:bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-slate-150 dark:border-slate-700">
                    {getActivityIcon(act.action_type, act.description)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    <span className="font-semibold">{you(user?._id, act.actor_id, act.actor?.full_name || 'Someone')}</span>
                    <span> {act.description ? act.description.charAt(0).toLowerCase() + act.description.slice(1) : ''}</span>
                    {act.trip_name && !act.description?.toLowerCase().includes(act.trip_name.toLowerCase()) && (
                      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}> in {act.trip_name}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{getTimeAgo(act.created_at)}</span>
                    {act.trip_id && (
                      <Link
                        to={`/trips/${act.trip_id}`}
                        className={`text-[11px] font-medium transition-colors ${isDark ? 'text-accent-blue hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        View trip →
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
