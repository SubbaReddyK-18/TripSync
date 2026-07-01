import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useTripStore from '../stores/tripStore'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import { createTrip, joinTripByCode } from '../api/trips'
import * as dashboardApi from '../api/dashboard'
import { getAdminAnalytics, exportAnalytics as exportAnalyticsApi } from '../api/admin'
import { useRequestLock } from '../hooks/useRequestLock'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'
import { you } from '../utils/displayName'

const VISIBLE_RANGES = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
]

const OVERFLOW_RANGES = [
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All Time' },
]

const ADMIN_RANGES = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All Time' },
]

const statusColors = {
  planning: 'badge-amber',
  ongoing: 'badge-green',
  completed: 'badge-blue',
}

const KPI_LABELS = {
  day: ['Activities', 'Total Expenses', 'Active Members', 'Expenses Logged', 'Pending Settlements'],
  week: ['Activities', 'Total Expenses', 'Active Members', 'Expenses Logged', 'Pending Settlements'],
  month: ['Activities', 'Total Expenses', 'Active Members', 'Expenses Logged', 'Pending Settlements'],
  year: ['Activities', 'Total Expenses', 'Active Members', 'Expenses Logged', 'Pending Settlements', 'Total Budget'],
  all: ['Activities', 'Total Expenses', 'Active Members', 'Expenses Logged', 'Pending Settlements', 'Total Budget'],
}

const CHART_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F472B6']

const ADMIN_LABELS = {
  day: {
    active_users: 'Active Users Today',
    trips_created: 'Trips Created Today',
    expenses_logged: 'Expenses Logged Today',
    expense_volume: 'Expense Volume Today',
    places_added: 'Places Added Today',
    settlements_completed: 'Settlements Completed Today',
    new_users: 'New Users Today',
  },
  week: {
    active_users: 'Active Users This Week',
    trips_created: 'Trips Created This Week',
    expenses_logged: 'Expenses Logged This Week',
    expense_volume: 'Expense Volume This Week',
    places_added: 'Places Added This Week',
    settlements_completed: 'Settlements Completed This Week',
    new_users: 'New Users This Week',
  },
  month: {
    active_users: 'Active Users This Month',
    trips_created: 'Trips Created This Month',
    expenses_logged: 'Expenses Logged This Month',
    expense_volume: 'Expense Volume This Month',
    places_added: 'Places Added This Month',
    settlements_completed: 'Settlements Completed This Month',
    new_users: 'New Users This Month',
  },
  year: {
    active_users: 'Active Users This Year',
    trips_created: 'Trips Created This Year',
    expenses_logged: 'Expenses Logged This Year',
    expense_volume: 'Expense Volume This Year',
    places_added: 'Places Added This Year',
    settlements_completed: 'Settlements Completed This Year',
    new_users: 'New Users This Year',
  },
  all: {
    active_users: 'Total Active Users',
    trips_created: 'Total Trips',
    expenses_logged: 'Total Expenses',
    expense_volume: 'Total Expense Volume',
    places_added: 'Total Places',
    settlements_completed: 'Total Settlements',
    new_users: 'Total Users',
  },
}

function StatCard({ icon, value, label, trend, color, isDark }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-3 lg:p-4 transition-all duration-300 h-full ${isDark
        ? 'bg-[#111827] border border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
        : 'bg-white border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-start justify-between mb-1 lg:mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? `bg-${color}/10` : `bg-${color}/5`
          }`}
          style={{ backgroundColor: isDark ? `${color}15` : `${color}10` }}
        >
          <span className="text-base">{icon}</span>
        </div>
        {trend && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trend.startsWith('+')
            ? 'text-accent-green bg-accent-green/10'
            : 'text-accent-red bg-accent-red/10'
            }`}>
            {trend}
          </span>
        )}
      </div>
      <p className={`text-lg font-bold font-heading tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </p>
      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
    </div>
  )
}

function EmptyState({ icon, title, description, action, onAction, isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center py-12 px-6 rounded-2xl border-2 border-dashed transition-colors ${isDark ? 'border-white/[0.06]' : 'border-slate-200'
        }`}
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'
        }`}>
        {icon}
      </div>
      <h3 className={`text-base font-heading font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
      <p className={`text-sm max-w-xs mx-auto mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
      {action && onAction && (
        <button onClick={onAction} className="text-sm font-semibold text-accent-blue hover:text-blue-400 transition-colors">
          {action} →
        </button>
      )}
    </motion.div>
  )
}

function AvatarBadge({ user, size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-sm'
  return user?.profile_photo_url ? (
    <img src={user.profile_photo_url} alt="" className={`${sizeClasses} rounded-full object-cover ring-2 ring-border shrink-0`} />
  ) : (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-accent-indigo to-accent-purple flex items-center justify-center font-bold text-white shrink-0 shadow-sm`}>
      {user?.full_name?.charAt(0) || user?.username?.charAt(0) || '?'}
    </div>
  )
}

function RoleBadge({ role }) {
  return (
    <span className={`badge text-[10px] ${role === 'admin' ? 'badge-amber' : 'badge-blue'}`}>
      {role === 'admin' ? 'Admin' : 'User'}
    </span>
  )
}

function StatusBadge({ isActive, lastActive }) {
  const isRecent = lastActive && (Date.now() - new Date(lastActive)) < 3600000
  const online = isActive !== false && isRecent
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${isActive === false ? 'text-text-muted' : online ? 'text-accent-green' : 'text-accent-blue'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive === false ? 'bg-text-muted' : online ? 'bg-accent-green' : 'bg-accent-blue'
        }`} />
      {isActive === false ? 'Offline' : online ? 'Online' : 'Recent'}
    </span>
  )
}

function PremiumTable({ columns, data, onRowClick, isDark }) {
  if (!data || data.length === 0) return null

  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors ${isDark ? 'border-white/[0.06]' : 'border-slate-200/60'
      }`}>
      <table className="w-full">
        <thead>
          <tr className={isDark ? 'bg-white/[0.02]' : 'bg-slate-50/50'}>
            {columns.map((col) => (
              <th key={col.key || col.label} className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <motion.tr
              key={row._id || idx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => onRowClick?.(row)}
              className={`border-t transition-all duration-150 cursor-pointer ${isDark ? 'border-white/[0.04] hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50/50'
                }`}
            >
              {columns.map((col) => {
                let content = row[col.key]
                if (col.type === 'avatar') content = <AvatarBadge user={row} size={col.size} />
                else if (col.type === 'role') content = <RoleBadge role={row[col.key]} />
                else if (col.type === 'status') content = <StatusBadge isActive={row.is_active} lastActive={row.lastActive} />
                else if (col.render) content = col.render(row)
                return (
                  <td key={col.key || col.label} className={`px-5 py-3.5 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {content}
                  </td>
                )
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DashboardPage() {
  const { trips, fetchTrips, isLoading: tripsLoading } = useTripStore()
  const { user } = useAuthStore()
  const { isDark, systemConfig } = useUiStore()
  const navigate = useNavigate()

  const [range, setRange] = useState('day')
  const [showOverflow, setShowOverflow] = useState(false)
  const overflowRef = useRef(null)
  const [overview, setOverview] = useState(null)
  const [dashboardExpenses, setDashboardExpenses] = useState([])
  const [settlements, setSettlements] = useState({ i_owe: [], owed_to_me: [] })
  const [budget, setBudget] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [form, setForm] = useState({ title: '', destination: '', start_date: '', end_date: '', description: '' })
  const [creating, createAction] = useRequestLock()
  const [joining, joinAction] = useRequestLock()

  const [adminAnalytics, setAdminAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [adminRange, setAdminRange] = useState('month')
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)
  const [drilldownYear, setDrilldownYear] = useState(null)

  const handleExport = async (fmt) => {
    try {
      const { data } = await exportAnalyticsApi({ range: adminRange, format: fmt })
      const blob = new Blob([data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics_report_${adminRange}.${fmt === 'xlsx' ? 'xlsx' : fmt}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Analytics exported as ${fmt.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    }
  }

  // Hour-based greeting
  const hour = new Date().getHours()
  const greeting = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? '☀️ Good afternoon' : '🌆 Good evening'
  const userName = user?.full_name?.split(' ')[0] || user?.username || 'there'

  useEffect(() => {
    const handleClick = (e) => { if (overflowRef.current && !overflowRef.current.contains(e.target)) setShowOverflow(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  
  useEffect(() => {
    if (user?.role === 'admin') {
      setAnalyticsLoading(true)
      getAdminAnalytics({ range: adminRange }).then(({ data }) => {
        setAdminAnalytics(data.data)
      }).catch(() => { }).finally(() => setAnalyticsLoading(false))
    }
  }, [user, adminRange])

  useEffect(() => { fetchTrips() }, [])

  const buildParams = useCallback(() => {
    return { range }
  }, [range])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    const params = buildParams()
    try {
      const [ovRes, expRes, setRes, budRes, actRes] = await Promise.all([
        dashboardApi.getDashboardOverview(params),
        dashboardApi.getDashboardExpenses(params),
        dashboardApi.getDashboardSettlements(),
        dashboardApi.getDashboardBudget(),
        dashboardApi.getDashboardActivity(),
      ])
      setOverview(ovRes.data.data)
      setDashboardExpenses(expRes.data.data.expenses || [])
      setSettlements(setRes.data.data || { i_owe: [], owed_to_me: [] })
      setBudget(budRes.data.data)
      setRecentActivity(actRes.data.data.activities || [])
    } catch { }
    setLoading(false)
  }, [buildParams])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const handleCreate = async (e) => {
    e.preventDefault()
    await createAction(async () => {
      const { data } = await createTrip(form)
      toast.success('Trip created!')
      setShowCreate(false)
      setForm({ title: '', destination: '', start_date: '', end_date: '', description: '' })
      fetchTrips()
      loadDashboard()
      navigate(`/trips/${data.data.trip._id}`)
    }).catch((err) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to create trip'
      toast.error(msg)
    })
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    await joinAction(async () => {
      const { data } = await joinTripByCode(joinCode)
      toast.success('Joined trip!')
      setShowJoin(false)
      setJoinCode('')
      fetchTrips()
      loadDashboard()
      if (data?.data?.trip?._id) {
        navigate(`/trips/${data.data.trip._id}`)
      }
    }).catch((err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to join trip')
    })
  }

  const getProximity = (trip) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = trip.start_date ? new Date(trip.start_date) : null
    const end = trip.end_date ? new Date(trip.end_date) : null
    if (start && end) {
      const diffStart = Math.abs(start - today)
      const diffEnd = Math.abs(end - today)
      return Math.min(diffStart, diffEnd)
    }
    return Infinity
  }

  const sortedTrips = [...trips].sort((a, b) => getProximity(a) - getProximity(b))
  const nearbyTrips = sortedTrips.slice(0, 5)

  const totalSpent = overview ? (overview.total_spent / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'
  const totalBudgetVal = overview ? (overview.total_budget / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'

  // Compute filter boundaries based on selected range
  const now = new Date()
  const getFilterStart = () => {
    switch (range) {
      case 'day': return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      case 'week': return new Date(now - 7 * 86400000)
      case 'month': return new Date(now - 30 * 86400000)
      case 'year': return new Date(now - 365 * 86400000)
      case 'all': return new Date(0)
      default: return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }
  }
  const getFilterEnd = () => {
    if (range === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    return now
  }
  const filterStart = getFilterStart()
  const filterEnd = getFilterEnd()
  const rangeLabel = [...VISIBLE_RANGES, ...OVERFLOW_RANGES].find((r) => r.key === range)?.label || 'Day'
  const rangeCaption = range === 'day' ? 'Today' : range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : range === 'year' ? 'This Year' : 'All Time'

  // Trips Participated — every trip in the store is one the user created or joined (membership-filtered API)
  const tripsParticipated = trips.filter((t) => {
    if (t.start_date && t.end_date) {
      const start = new Date(t.start_date)
      const end = new Date(t.end_date)
      return start <= filterEnd && end >= filterStart
    }
    const created = t.created_at ? new Date(t.created_at) : null
    return created && created >= filterStart && created <= filterEnd
  }).length

  // Active Trips — overlap with selected period (start <= filterEnd AND end >= filterStart)
  const activeTripsFiltered = trips.filter((t) => {
    if (!t.start_date || !t.end_date) return false
    const start = new Date(t.start_date)
    const end = new Date(t.end_date)
    return start <= filterEnd && end >= filterStart
  }).length

  // Members Participated — unique users from trips within the period
  const membersParticipated = trips.reduce((sum, t) => {
    const created = t.created_at ? new Date(t.created_at) : null
    if (created && created >= filterStart && created <= filterEnd) {
      return sum + (t.member_count || 0)
    }
    return sum
  }, 0)



  // Process chart data for user dashboard
  const categoryChartData = dashboardExpenses.reduce((acc, e) => {
    const cat = e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : 'Other'
    if (!acc[cat]) acc[cat] = 0
    acc[cat] += e.amount
    return acc
  }, {})
  const categoryChartEntries = Object.entries(categoryChartData).map(([category, total]) => ({ category, total }))

  const spendingTrendEntries = (() => {
    if (range === 'day') {
      const hourly = Array.from({ length: 24 }, (_, i) => ({ label: `${String(i).padStart(2, '0')}:00`, total: 0 }))
      dashboardExpenses.forEach((e) => {
        const d = new Date(e.created_at || e.date)
        const h = d.getHours()
        hourly[h].total += Math.round(e.amount / 100)
      })
      return { data: hourly, type: 'hour' }
    }
    if (range === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayTotals = days.map((label) => ({ label, total: 0 }))
      dashboardExpenses.forEach((e) => {
        const d = new Date(e.created_at || e.date)
        const dayIdx = d.getDay()
        dayTotals[dayIdx].total += Math.round(e.amount / 100)
      })
      return { data: dayTotals, type: 'day' }
    }
    if (range === 'month') {
      const weekly = Array.from({ length: 5 }, (_, i) => ({ label: `Week ${i + 1}`, total: 0 }))
      dashboardExpenses.forEach((e) => {
        const d = new Date(e.created_at || e.date)
        const day = d.getDate()
        const weekIdx = Math.min(Math.floor((day - 1) / 7), 4)
        weekly[weekIdx].total += Math.round(e.amount / 100)
      })
      return { data: weekly, type: 'week' }
    }
    if (range === 'year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthly = months.map((label) => ({ label, total: 0 }))
      dashboardExpenses.forEach((e) => {
        const d = new Date(e.created_at || e.date)
        const m = d.getMonth()
        monthly[m].total += Math.round(e.amount / 100)
      })
      return { data: monthly, type: 'month' }
    }
    // All-Time
    const expenses = dashboardExpenses.filter(e => e.created_at || e.date)
    if (expenses.length === 0) return { data: [], type: 'all' }

    const dates = expenses.map(e => new Date(e.created_at || e.date))
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))
    const totalMonths = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth()) + 1
    const totalYears = Math.ceil(totalMonths / 12)

    if (drilldownYear) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthly = months.map((label) => ({ label, total: 0 }))
      expenses.forEach((e) => {
        const d = new Date(e.created_at || e.date)
        if (d.getFullYear() === drilldownYear) {
          monthly[d.getMonth()].total += Math.round(e.amount / 100)
        }
      })
      return { data: monthly, type: 'month_drilldown', drilldownYear }
    }

    if (totalMonths <= 18 || totalYears <= 1) {
      const monthYearLabels = []
      const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
      while (current <= maxDate) {
        const label = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        monthYearLabels.push({ label, total: 0, fullDate: new Date(current), year: current.getFullYear(), month: current.getMonth() })
        current.setMonth(current.getMonth() + 1)
      }
      expenses.forEach((e) => {
        const d = new Date(e.created_at || e.date)
        const idx = monthYearLabels.findIndex(m => m.year === d.getFullYear() && m.month === d.getMonth())
        if (idx >= 0) monthYearLabels[idx].total += Math.round(e.amount / 100)
      })
      const step = totalMonths > 12 ? 2 : 1
      return { data: monthYearLabels, type: 'month_year', labelStep: step }
    }

    if (totalMonths <= 36) {
      const monthYearLabels = []
      const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
      while (current <= maxDate) {
        const label = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        monthYearLabels.push({ label, total: 0, fullDate: new Date(current), year: current.getFullYear(), month: current.getMonth() })
        current.setMonth(current.getMonth() + 1)
      }
      expenses.forEach((e) => {
        const d = new Date(e.created_at || e.date)
        const idx = monthYearLabels.findIndex(m => m.year === d.getFullYear() && m.month === d.getMonth())
        if (idx >= 0) monthYearLabels[idx].total += Math.round(e.amount / 100)
      })
      const step = totalMonths > 24 ? 6 : 3
      return { data: monthYearLabels, type: 'month_year', labelStep: step }
    }

    // More than 3 years: yearly aggregation
    const yearTotals = {}
    expenses.forEach((e) => {
      const d = new Date(e.created_at || e.date)
      const y = d.getFullYear()
      if (!yearTotals[y]) yearTotals[y] = 0
      yearTotals[y] += Math.round(e.amount / 100)
    })
    const yearlyData = Object.entries(yearTotals)
      .sort(([a], [b]) => a - b)
      .map(([year, total]) => ({ label: year, total, year: parseInt(year) }))
    return { data: yearlyData, type: 'year' }
  })()

  const spendingTrendTitle =
    range === 'all' ? 'All-Time Spending Trend' : 'Spending Trend'

  const spendingTrendSummary = (() => {
    const entries = spendingTrendEntries.data || []
    if (entries.length === 0) return null

    if (range === 'day') {
      const maxEntry = entries.reduce((a, b) => a.total > b.total ? a : b)
      const nonZeroEntries = entries.filter(e => e.total > 0)
      const minEntry = nonZeroEntries.length > 0 ? nonZeroEntries.reduce((a, b) => a.total < b.total ? a : b) : entries[0]
      const avg = nonZeroEntries.length > 0
        ? entries.reduce((s, e) => s + e.total, 0) / nonZeroEntries.length
        : 0
      const amounts = dashboardExpenses.map(e => Math.round(e.amount / 100))
      const highestSingle = Math.max(...amounts, 0)
      const lowestSingle = amounts.length > 0 ? Math.min(...amounts) : 0
      const totalSpending = entries.reduce((s, e) => s + e.total, 0)
      const lowestExp = dashboardExpenses.reduce((a, b) => Math.round(a.amount / 100) < Math.round(b.amount / 100) ? a : b, dashboardExpenses[0])
      return {
        highest: { label: maxEntry.label, value: maxEntry.total },
        lowest: { label: minEntry.label, value: minEntry.total },
        average: dashboardExpenses.length > 0 ? totalSpending / dashboardExpenses.length : 0,
        highestSingle,
        lowestSingle,
        lowestSingleTitle: lowestExp?.title || lowestExp?.category || '—',
        totalSpending,
        unit: 'hour'
      }
    }
    if (range === 'week') {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const maxEntry = entries.reduce((a, b) => a.total > b.total ? a : b)
      const nonZeroEntries = entries.filter(e => e.total > 0)
      const minEntry = nonZeroEntries.length > 0 ? nonZeroEntries.reduce((a, b) => a.total < b.total ? a : b) : entries[0]
      const avg = entries.reduce((s, e) => s + e.total, 0) / 7
      const highestSingle = Math.max(...dashboardExpenses.map(e => Math.round(e.amount / 100)), 0)
      return {
        highest: { label: dayNames[entries.indexOf(maxEntry)], value: maxEntry.total },
        lowest: { label: dayNames[entries.indexOf(minEntry)], value: minEntry.total },
        average: avg,
        highestSingle,
        unit: 'day'
      }
    }
    if (range === 'month') {
      const weeklyTotals = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0, 'Week 5': 0 }
      dashboardExpenses.forEach(e => {
        const d = new Date(e.date || e.created_at)
        const day = d.getDate()
        const weekIdx = Math.min(Math.floor((day - 1) / 7), 4)
        const label = `Week ${weekIdx + 1}`
        weeklyTotals[label] += Math.round(e.amount / 100)
      })
      const weekEntries = Object.entries(weeklyTotals).filter(([, v]) => v > 0).map(([label, total]) => ({ label, total }))
      if (weekEntries.length === 0) return null
      const maxEntry = weekEntries.reduce((a, b) => a.total > b.total ? a : b)
      const minEntry = weekEntries.reduce((a, b) => a.total < b.total ? a : b)
      const totalSpent = weekEntries.reduce((s, e) => s + e.total, 0)
      const avg = totalSpent / weekEntries.length
      const highestSingle = Math.max(...dashboardExpenses.map(e => Math.round(e.amount / 100)), 0)
      return {
        highest: { label: maxEntry.label, value: maxEntry.total },
        lowest: { label: minEntry.label, value: minEntry.total },
        average: avg,
        highestSingle,
        unit: 'week'
      }
    }
    if (range === 'year') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const maxEntry = entries.reduce((a, b) => a.total > b.total ? a : b)
      const nonZeroEntries = entries.filter(e => e.total > 0)
      const minEntry = nonZeroEntries.length > 0 ? nonZeroEntries.reduce((a, b) => a.total < b.total ? a : b) : entries[0]
      const avg = entries.reduce((s, e) => s + e.total, 0) / 12
      const highestSingle = Math.max(...dashboardExpenses.map(e => Math.round(e.amount / 100)), 0)
      return {
        highest: { label: monthNames[entries.indexOf(maxEntry)], value: maxEntry.total },
        lowest: { label: monthNames[entries.indexOf(minEntry)], value: minEntry.total },
        average: avg,
        highestSingle,
        unit: 'month'
      }
    }
    if (range === 'all') {
      const trendType = spendingTrendEntries.type
      if (trendType === 'month_drilldown') {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const maxEntry = entries.reduce((a, b) => a.total > b.total ? a : b)
        const nonZeroEntries = entries.filter(e => e.total > 0)
        const minEntry = nonZeroEntries.length > 0 ? nonZeroEntries.reduce((a, b) => a.total < b.total ? a : b) : entries[0]
        const avg = entries.reduce((s, e) => s + e.total, 0) / 12
        const highestSingle = Math.max(...dashboardExpenses.map(e => Math.round(e.amount / 100)), 0)
        return {
          highest: { label: `${monthNames[entries.indexOf(maxEntry)]} ${drilldownYear}`, value: maxEntry.total },
          lowest: { label: `${monthNames[entries.indexOf(minEntry)]} ${drilldownYear}`, value: minEntry.total },
          average: avg,
          highestSingle,
          unit: 'month'
        }
      }
      if (trendType === 'year') {
        const maxEntry = entries.reduce((a, b) => a.total > b.total ? a : b)
        const nonZeroEntries = entries.filter(e => e.total > 0)
        const minEntry = nonZeroEntries.length > 0 ? nonZeroEntries.reduce((a, b) => a.total < b.total ? a : b) : entries[0]
        const avg = entries.length > 0 ? entries.reduce((s, e) => s + e.total, 0) / entries.length : 0
        const highestSingle = Math.max(...dashboardExpenses.map(e => Math.round(e.amount / 100)), 0)
        return {
          highest: { label: maxEntry.label, value: maxEntry.total },
          lowest: { label: minEntry.label, value: minEntry.total },
          average: avg,
          highestSingle,
          unit: 'year'
        }
      }
      // Month-Year type
      const maxEntry = entries.reduce((a, b) => a.total > b.total ? a : b)
      const nonZeroEntries = entries.filter(e => e.total > 0)
      const minEntry = nonZeroEntries.length > 0 ? nonZeroEntries.reduce((a, b) => a.total < b.total ? a : b) : entries[0]
      const total = entries.reduce((s, e) => s + e.total, 0)
      const avg = total / entries.length
      const highestSingle = Math.max(...dashboardExpenses.map(e => Math.round(e.amount / 100)), 0)
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const maxDate = maxEntry.fullDate || new Date()
      const minDate = minEntry.fullDate || new Date()
      return {
        highest: { label: `${monthNames[maxDate.getMonth()]} ${maxDate.getFullYear()}`, value: maxEntry.total },
        lowest: { label: `${monthNames[minDate.getMonth()]} ${minDate.getFullYear()}`, value: minEntry.total },
        average: avg,
        highestSingle,
        unit: 'month'
      }
    }
    return null
  })()

  const topExpense = (() => {
    if (dashboardExpenses.length === 0) return null
    const top = dashboardExpenses.reduce((a, b) => Math.round(a.amount / 100) > Math.round(b.amount / 100) ? a : b)
    if (!top) return null
    return {
      amount: Math.round(top.amount / 100),
      category: top.category ? top.category.charAt(0).toUpperCase() + top.category.slice(1) : 'Other',
      title: top.title || top.description || ''
    }
  })()

  const USER_CHART_COLORS = isDark
    ? ['#8B5CF6', '#6366F1', '#06B6D4', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#EF4444']
    : ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F472B6']

  // ====== ADMIN DASHBOARD ======
  if (user?.role === 'admin') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      className="w-full max-w-full space-y-3 lg:space-y-4"
      >
        {/* Hero Section */}
        <div className={`relative overflow-hidden rounded-[32px] p-8 lg:p-10 ${isDark
          ? 'bg-[#111827] border border-white/[0.06]'
          : 'bg-white border border-slate-200/60 shadow-sm'
          }`}>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-accent-indigo/15 text-accent-indigo' : 'bg-indigo-50 text-indigo-600'
                }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Admin Dashboard
              </div>
              <h1 className={`text-4xl sm:text-5xl font-heading font-bold tracking-tight leading-[1.1] ${isDark ? 'text-white' : 'text-slate-900'
                }`}>
                {greeting}, {userName}
              </h1>
              <p className={`text-base max-w-xl ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Monitor system activity and review platform analytics.
              </p>
            </div>
            {/* Platform Summary Chips */}
            <div className="flex items-center gap-3 shrink-0">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isDark ? 'bg-white/[0.04] border border-white/[0.06]' : 'bg-slate-50/70 border border-slate-200/60'
                }`}>
                <span className="text-lg">👥</span>
                <div>
                  <p className={`text-lg font-bold font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {adminAnalytics?.hero_users ?? '-'}
                  </p>
                  <p className={`text-[10px] whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Users</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isDark ? 'bg-white/[0.04] border border-white/[0.06]' : 'bg-slate-50/70 border border-slate-200/60'
                }`}>
                <span className="text-lg">🛡️</span>
                <div>
                  <p className={`text-lg font-bold font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {adminAnalytics?.hero_admins ?? '-'}
                  </p>
                  <p className={`text-[10px] whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Admins</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {analyticsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-white/[0.15]' : 'border-slate-300'
              }`} />
          </div>
        ) : adminAnalytics ? (
          <>
            {/* Admin Filter + Export */}
            <div className="flex items-center justify-end gap-3">
              <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]">
                {ADMIN_RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setAdminRange(r.key)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all duration-200 ${adminRange === r.key
                      ? isDark
                        ? 'bg-[#1e293b] text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isDark
                        ? 'text-slate-500 hover:text-slate-300'
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setExportOpen(!exportOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 ${isDark
                    ? 'bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:bg-white/[0.08]'
                    : 'bg-slate-100/70 border border-slate-200/60 text-slate-600 hover:bg-slate-200/50'
                    }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Export
                </button>
                {exportOpen && (
                  <div className={`absolute right-0 top-full mt-1 z-30 min-w-[140px] rounded-xl overflow-hidden shadow-lg ${isDark ? 'bg-[#1e293b] border border-white/[0.08]' : 'bg-white border border-slate-200 shadow-xl'
                    }`}>
                    {['pdf', 'xlsx', 'csv'].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => { handleExport(fmt); setExportOpen(false) }}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-white/[0.04]' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                      >
                        {fmt === 'pdf' && <span className="text-base">📄</span>}
                        {fmt === 'xlsx' && <span className="text-base">📊</span>}
                        {fmt === 'csv' && <span className="text-base">📋</span>}
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { icon: '👤', key: 'active_users' },
                { icon: '🗺️', key: 'trips_created' },
                { icon: '💳', key: 'expenses_logged' },
                { icon: '💵', key: 'expense_volume', format: 'currency' },
                { icon: '📍', key: 'places_added' },
                { icon: '💰', key: 'settlements_completed' },
                { icon: '👥', key: 'new_users' },
              ].map((item, i) => {
                const stat = adminAnalytics?.[item.key]
                const val = stat?.value ?? 0
                const growthRaw = stat?.growth
                const trend = growthRaw != null
                  ? `${growthRaw > 0 ? '+' : ''}${growthRaw}%`
                  : null
                return (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className={`rounded-2xl p-4 transition-all duration-300 ${isDark
                      ? 'bg-[#111827] border border-white/[0.06]'
                      : 'bg-white border border-slate-200/60 shadow-sm'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{item.icon}</span>
                      {trend && adminRange !== 'all' && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${growthRaw > 0
                          ? 'text-accent-green bg-accent-green/10'
                          : 'text-accent-red bg-accent-red/10'
                          }`}>
                          {trend}
                        </span>
                      )}
                    </div>
                    <p className={`text-xl font-bold font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.format === 'currency' ? `₹${val.toLocaleString('en-IN')}` : val}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {ADMIN_LABELS[adminRange]?.[item.key] || item.label}
                    </p>
                  </motion.div>
                )
              })}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {adminAnalytics.trips_per_month?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`rounded-2xl p-4 lg:p-6 transition-colors ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'
                    }`}
                >
                  <h3 className={`text-sm font-heading font-semibold mb-5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Trip Creation Trends
                  </h3>
                  <div className="h-[150px] lg:h-[220px]"><ResponsiveContainer width="100%" height="100%">
                    <BarChart data={adminAnalytics.trips_per_month}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} />
                      <XAxis dataKey="label" stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                      <YAxis stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                      <Tooltip contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#6366F1" animationBegin={200} animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer></div>
                </motion.div>
              )}

              {adminAnalytics.expense_category_distribution?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`rounded-2xl p-6 transition-colors ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'
                    }`}
                >
                  <h3 className={`text-sm font-heading font-semibold mb-5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Expense Category Distribution
                  </h3>
                  <div className="h-[200px] lg:h-[280px]"><ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={adminAnalytics.expense_category_distribution}
                        cx="50%" cy="50%" outerRadius={100}
                        dataKey="total"
                        labelLine={false}
                        animationBegin={400}
                        animationDuration={1000}
                      >
                        {adminAnalytics.expense_category_distribution.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => {
                          const pct = props.payload.percentage || 0
                          return [`₹${(value / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${pct}%)`, name]
                        }}
                        contentStyle={{
                          backgroundColor: isDark ? '#1e293b' : '#fff',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                          borderRadius: '12px', fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer></div>
                  <div className="mt-3 space-y-1.5">
                    {adminAnalytics.expense_category_distribution.map((entry, i) => (
                      <div key={entry.category} className={`flex items-center justify-between px-1 py-1 rounded-lg ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className={`text-xs font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{entry.category}</span>
                        </div>
                        <span className={`text-xs font-mono shrink-0 ml-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          ₹{(entry.total / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })} · {entry.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {adminAnalytics.monthly_expense_volume?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`rounded-2xl p-4 lg:p-6 transition-colors ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'
                    }`}
                >
                  <h3 className={`text-sm font-heading font-semibold mb-5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Expense Volume Trends
                  </h3>
                  <div className="h-[150px] lg:h-[220px]"><ResponsiveContainer width="100%" height="100%">
                    <LineChart data={adminAnalytics.monthly_expense_volume.map((d) => ({ ...d, total: d.total / 100 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} />
                      <XAxis dataKey="label" stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                      <YAxis stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                      <Tooltip contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        borderRadius: '12px', fontSize: '12px'
                      }} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#6366F1"
                        strokeWidth={2.5}
                        dot={{ fill: '#6366F1', stroke: '#6366F1', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                        connectNulls
                        animationBegin={600}
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer></div>
                </motion.div>
              )}
            </div>
          </>
        ) : null}
      </motion.div>
    )
  }

  const isOperational = range === 'day' || range === 'week'

  const getDisplayTrips = () => {
    const now = new Date()
    const ongoing = trips.filter((t) => t.status === 'ongoing')
    const upcoming = trips.filter((t) => t.status === 'planning' && t.start_date && new Date(t.start_date) > now)
    const completed = [...trips.filter((t) => t.status === 'completed')].sort((a, b) => new Date(b.end_date) - new Date(a.end_date))
    const display = []
    display.push(...ongoing.slice(0, 3))
    if (display.length < 3) display.push(...upcoming.slice(0, 3 - display.length))
    if (display.length < 3) display.push(...completed.slice(0, 3 - display.length))
    return display
  }

  // ====== USER DASHBOARD ======
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-full space-y-3 lg:space-y-4"
    >
      {/* ====== ROW 1: HERO SECTION ====== */}
      <div className={`relative overflow-hidden rounded-[32px] p-4 lg:p-6 backdrop-blur-sm ${isDark
        ? 'bg-[#111827]/90 border border-white/[0.06]'
        : 'bg-white/90 border border-slate-200/60 shadow-sm'
        }`}>
        <div className={`absolute inset-0 pointer-events-none ${isDark
          ? 'bg-gradient-to-br from-accent-blue/[0.03] via-transparent to-accent-indigo/[0.03]'
          : 'bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50'
          }`} />

        <div className="relative lg:absolute top-0 right-0 lg:top-8 lg:right-8 z-20 flex items-center gap-0.5 p-0.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] mb-4 lg:mb-0">
          {VISIBLE_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all duration-200 ${range === r.key
                ? isDark
                  ? 'bg-[#1e293b] text-white shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm'
                : isDark
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {r.label}
            </button>
          ))}
          <div className="relative" ref={overflowRef}>
            <button
              onClick={() => setShowOverflow(!showOverflow)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all duration-200 ${OVERFLOW_RANGES.some((r) => r.key === range)
                ? isDark
                  ? 'bg-[#1e293b] text-white shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm'
                : isDark
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              ⋯
            </button>
            {showOverflow && (
              <div className={`absolute right-0 top-full mt-1 z-30 min-w-[120px] rounded-xl overflow-hidden shadow-lg ${isDark ? 'bg-[#1e293b] border border-white/[0.08]' : 'bg-white border border-slate-200 shadow-xl'}`}>
                {OVERFLOW_RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => { setRange(r.key); setShowOverflow(false) }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors ${range === r.key
                      ? isDark ? 'text-white bg-white/[0.06]' : 'text-slate-900 bg-slate-50'
                      : isDark ? 'text-slate-300 hover:bg-white/[0.04]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
          <div className="space-y-2 max-w-xl">
            <h1 className={`text-2xl sm:text-3xl font-heading font-bold tracking-tight leading-[1.1] ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {greeting}, {userName} 👋
            </h1>
            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {range === 'day' ? 'Today\'s operational overview.' : range === 'week' ? 'Your weekly insights at a glance.' : 'Track, analyze, and manage your travel finances.'}
            </p>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {range === 'day' ? `${rangeCaption} — ${activeTripsFiltered} active trip${activeTripsFiltered !== 1 ? 's' : ''}` : `${rangeCaption} overview`}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {systemConfig.enableTrips && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreate(true)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${isDark
                    ? 'bg-gradient-to-r from-accent-blue to-accent-indigo text-white shadow-lg shadow-accent-blue/20'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                    }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Trip
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowJoin(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${isDark
                  ? 'bg-white/[0.06] border border-white/[0.08] text-slate-200 hover:bg-white/[0.1]'
                  : 'bg-slate-100/70 border border-slate-200/60 text-slate-700 hover:bg-slate-200/50'
                  }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Join Trip
              </motion.button>
            </div>
          </div>

          <div className="shrink-0 lg:mt-12 lg:mb-2">
            <motion.div
              key={range}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-center rounded-2xl p-3 lg:p-4 min-w-[120px] ${isDark ? 'bg-white/[0.04] border border-white/[0.06]' : 'bg-slate-50/50 border border-slate-200/60'}`}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Active Trips
              </p>
              <p className={`text-3xl font-heading font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {activeTripsFiltered}
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ====== ROW 2: STATISTICS CARDS ====== */}
      {!loading && (
        <div className={`grid grid-cols-2 gap-3 ${(range === 'year' || range === 'all') ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
          <StatCard icon="🗺️" value={overview?.activity_count || 0} label={KPI_LABELS[range]?.[0] || 'Activities'} trend={null} color="#6366F1" isDark={isDark} />
          <StatCard icon="💳" value={`₹${totalSpent}`} label={KPI_LABELS[range]?.[1] || 'Total Expenses'} trend={null} color="#3B82F6" isDark={isDark} />
          <StatCard icon="👥" value={membersParticipated} label={KPI_LABELS[range]?.[2] || 'Active Members'} trend={null} color="#8B5CF6" isDark={isDark} />
          <StatCard icon="📸" value={overview?.expense_count || 0} label={KPI_LABELS[range]?.[3] || 'Expenses Logged'} trend={null} color="#10B981" isDark={isDark} />
          {(range === 'year' || range === 'all') ? (
            <StatCard icon="💰" value={`₹${totalBudgetVal}`} label={KPI_LABELS[range]?.[5] || 'Total Budget'} trend={null} color="#06B6D4" isDark={isDark} />
          ) : null}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex justify-center lg:block">
              <div className="w-1/2 lg:w-full">
                <StatCard icon="🤝" value={overview?.pending_settlements || 0} label={KPI_LABELS[range]?.[4] || 'Pending Settlements'} trend={overview?.pending_settlements > 0 ? `+${overview.pending_settlements}` : '0'} color="#F59E0B" isDark={isDark} />
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-white/[0.15]' : 'border-slate-300'}`} />
        </div>
      ) : (
        <>
          {/* ====== ROW 3: CHARTS / TRIPS ====== */}
          {/* DAY: [Spending Trend 65%] [My Trips 35%] */}
          {range === 'day' && (
            <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-3">
              {/* Spending Trend */}
              <div className={`rounded-2xl p-3 lg:p-4 transition-colors h-full ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
                <h3 className={`text-sm font-heading font-semibold mb-1.5 lg:mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Spending Trend
                </h3>
                {((spendingTrendEntries.data || []).some((e) => e.total > 0)) ? (
                  <div className="h-[140px] lg:h-[200px]"><ResponsiveContainer width="100%" height="100%">
                    <LineChart data={spendingTrendEntries.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} />
                      <XAxis dataKey="label" stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                      <YAxis stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        borderRadius: '12px', fontSize: '12px'
                      }} />
                      <Line type="monotone" dataKey="total" stroke={isDark ? '#06B6D4' : '#6366F1'} strokeWidth={2.5}
                        dot={{ fill: isDark ? '#06B6D4' : '#6366F1', strokeWidth: 0, r: 3 }}
                        animationBegin={400} animationDuration={1000} />
                    </LineChart>
                  </ResponsiveContainer></div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 lg:py-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                      📊
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No expenses today</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Add expenses to see your hourly trend.</p>
                  </div>
                )}
                  {spendingTrendSummary && (
                    <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                          <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Highest Single Expense</p>
                          <p className={`text-xs font-bold mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {topExpense?.title || topExpense?.category || '—'}
                            <span className={`text-[10px] font-mono ml-1 ${isDark ? 'text-accent-green' : 'text-green-600'}`}>- ₹{(topExpense?.amount || 0).toLocaleString('en-IN')}</span>
                          </p>
                        </div>
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                          <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Lowest Single Expense</p>
                          <p className={`text-xs font-bold mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {spendingTrendSummary.lowestSingleTitle || '—'}
                            <span className={`text-[10px] font-mono ml-1 ${isDark ? 'text-accent-red' : 'text-red-500'}`}>- ₹{(spendingTrendSummary.lowestSingle || 0).toLocaleString('en-IN')}</span>
                          </p>
                        </div>
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                          <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Spending</p>
                          <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{(spendingTrendSummary.totalSpending || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                          <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Average Expense</p>
                          <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{Math.round(spendingTrendSummary.average || 0).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                    )}
                </div>

                {/* My Trips */}
                <MyTripsCard
                trips={trips}
                tripsLoading={tripsLoading}
                displayTrips={getDisplayTrips()}
                systemConfig={systemConfig}
                setShowCreate={setShowCreate}
                isDark={isDark}
                statusColors={statusColors}
              />
            </div>
          )}

          {/* WEEK: [Expense Distribution 50%] [Spending Trend 50%] */}
          {range === 'week' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Expense Distribution */}
              {categoryChartEntries.length > 0 ? (
                <div className={`rounded-2xl p-3 lg:p-4 transition-colors h-full ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
                  <h3 className={`text-sm font-heading font-semibold mb-2 lg:mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Expense Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categoryChartEntries} cx="50%" cy="50%" outerRadius={110} dataKey="total" nameKey="category" labelLine={false} animationBegin={200} animationDuration={800}>
                        {categoryChartEntries.map((_, i) => (
                          <Cell key={i} fill={USER_CHART_COLORS[i % USER_CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => {
                        const total = categoryChartEntries.reduce((s, e) => s + e.total, 0)
                        return [`₹${(value / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${((value / total) * 100).toFixed(1)}%)`, name]
                      }} contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        borderRadius: '12px', fontSize: '12px'
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-1">
                    {categoryChartEntries.map((entry, i) => {
                      const total = categoryChartEntries.reduce((s, e) => s + e.total, 0)
                      return (
                        <div key={entry.category} className={`flex items-center justify-between px-1 py-0.5 rounded-lg ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: USER_CHART_COLORS[i % USER_CHART_COLORS.length] }} />
                            <span className={`text-[11px] font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{entry.category}</span>
                          </div>
                          <span className={`text-[11px] font-mono shrink-0 ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            ₹{(entry.total / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })} · {((entry.total / total) * 100).toFixed(1)}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl p-3 lg:p-4 transition-colors h-full flex flex-col items-center justify-center ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                    🥧
                  </div>
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No expenses this week</p>
                </div>
              )}

              {/* Spending Trend */}
              <div className={`rounded-2xl p-3 lg:p-4 transition-colors h-full ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
                <h3 className={`text-sm font-heading font-semibold mb-2 lg:mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Spending Trend
                </h3>
                {((spendingTrendEntries.data || []).some((e) => e.total > 0)) ? (
                  <>
                    <div className="h-[140px] lg:h-[200px]"><ResponsiveContainer width="100%" height="100%">
                      <LineChart data={spendingTrendEntries.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} />
                        <XAxis dataKey="label" stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                        <YAxis stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                        <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '12px', fontSize: '12px' }} />
                        <Line type="monotone" dataKey="total" stroke={isDark ? '#06B6D4' : '#6366F1'} strokeWidth={2.5}
                          dot={{ fill: isDark ? '#06B6D4' : '#6366F1', strokeWidth: 0, r: 3 }}
                          animationBegin={400} animationDuration={1000} />
                      </LineChart>
                    </ResponsiveContainer></div>
                    {spendingTrendSummary && (
                      <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                        <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Highest Spending Day</p>
                            <p className={`text-xs font-bold mt-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {spendingTrendSummary.highest.label}
                              <span className={`text-[10px] font-mono ml-1 ${isDark ? 'text-accent-green' : 'text-green-600'}`}>₹{spendingTrendSummary.highest.value.toLocaleString('en-IN')}</span>
                            </p>
                          </div>
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Lowest Spending Day</p>
                            <p className={`text-xs font-bold mt-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {spendingTrendSummary.lowest.label}
                              <span className={`text-[10px] font-mono ml-1 ${isDark ? 'text-accent-red' : 'text-red-500'}`}>₹{spendingTrendSummary.lowest.value.toLocaleString('en-IN')}</span>
                            </p>
                          </div>
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Average Daily Spending</p>
                            <p className={`text-xs font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{Math.round(spendingTrendSummary.average).toLocaleString('en-IN')}</p>
                          </div>
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Highest Single Expense</p>
                            <p className={`text-xs font-bold mt-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {topExpense?.title || topExpense?.category || '—'}
                              <span className={`text-[10px] font-mono ml-1 ${isDark ? 'text-accent-green' : 'text-green-600'}`}>- ₹{(topExpense?.amount || 0).toLocaleString('en-IN')}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 lg:py-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                      📈
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No data this week</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MONTH / YEAR / ALL TIME: [Expense Distribution 50%] [Spending Trend 50%] */}
          {(range === 'month' || range === 'year' || range === 'all') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              {/* Expense Distribution */}
                <div className={`rounded-2xl p-3 lg:p-4 transition-colors h-full ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
                  <h3 className={`text-sm font-heading font-semibold mb-2 lg:mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Expense Distribution
                  </h3>
                  {categoryChartEntries.length > 0 ? (
                    <>
                      <div className="h-[180px] lg:h-[260px]"><ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryChartEntries} cx="50%" cy="50%" outerRadius={110} dataKey="total" nameKey="category" labelLine={false} animationBegin={200} animationDuration={800}>
                            {categoryChartEntries.map((_, i) => (
                              <Cell key={i} fill={USER_CHART_COLORS[i % USER_CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => {
                            const total = categoryChartEntries.reduce((s, e) => s + e.total, 0)
                            return [`₹${(value / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${((value / total) * 100).toFixed(1)}%)`, name]
                          }} contentStyle={{
                            backgroundColor: isDark ? '#1e293b' : '#fff',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                            borderRadius: '12px', fontSize: '12px'
                          }} />
                        </PieChart>
                      </ResponsiveContainer></div>
                      <div className="mt-3 space-y-1">
                      {categoryChartEntries.map((entry, i) => {
                        const total = categoryChartEntries.reduce((s, e) => s + e.total, 0)
                        return (
                          <div key={entry.category} className={`flex items-center justify-between px-1 py-0.5 rounded-lg ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: USER_CHART_COLORS[i % USER_CHART_COLORS.length] }} />
                              <span className={`text-[11px] font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{entry.category}</span>
                            </div>
                            <span className={`text-[11px] font-mono shrink-0 ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              ₹{(entry.total / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })} · {((entry.total / total) * 100).toFixed(1)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                      🥧
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No expenses in this period</p>
                  </div>
                )}
              </div>

              {/* Spending Trend */}
              <div className={`rounded-2xl p-3 lg:p-4 transition-colors h-full ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-2 lg:mb-3">
                  <h3 className={`text-sm font-heading font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {spendingTrendTitle}
                  </h3>
                  {range === 'all' && spendingTrendEntries.type === 'year' && (
                    <div className="flex items-center gap-2">
                      {drilldownYear ? (
                        <button
                          onClick={() => setDrilldownYear(null)}
                          className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${isDark ? 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          ← All Years
                        </button>
                      ) : (
                        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Click a year to drill down</span>
                      )}
                    </div>
                  )}
                  {range === 'all' && spendingTrendEntries.type === 'month_drilldown' && (
                    <button
                      onClick={() => setDrilldownYear(null)}
                      className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${isDark ? 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      ← All Years
                    </button>
                  )}
                </div>
                {((spendingTrendEntries.data || []).some((e) => e.total > 0)) ? (
                  <>
                    <div className="h-[140px] lg:h-[200px]"><ResponsiveContainer width="100%" height="100%">
                      {(range === 'all' && spendingTrendEntries.type === 'year') ? (
                        <BarChart data={spendingTrendEntries.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} />
                          <XAxis dataKey="label" stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                          <YAxis stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                          <Tooltip formatter={(value, name, props) => {
                            const label = props?.payload?.label || ''
                            return [`₹${value.toLocaleString('en-IN')}`, `${label} Total`]
                          }} contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '12px', fontSize: '12px' }} />
                          <Bar dataKey="total" radius={[6, 6, 0, 0]} fill={isDark ? '#06B6D4' : '#6366F1'} cursor="pointer"
                            onClick={(data) => {
                              if (data?.year) setDrilldownYear(data.year)
                            }}
                          />
                        </BarChart>
                      ) : (
                        <LineChart data={spendingTrendEntries.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} />
                          <XAxis
                            dataKey="label"
                            stroke={isDark ? '#475569' : '#94a3b8'}
                            fontSize={11}
                            interval={spendingTrendEntries.labelStep ? spendingTrendEntries.labelStep - 1 : 0}
                          />
                          <YAxis stroke={isDark ? '#475569' : '#94a3b8'} fontSize={11} />
                          <Tooltip formatter={(value, name, props) => {
                            const label = props?.payload?.fullDate
                              ? new Date(props.payload.fullDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                              : props?.payload?.label || ''
                            return [`₹${value.toLocaleString('en-IN')}`, label]
                          }} contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '12px', fontSize: '12px' }} />
                          <Line type="monotone" dataKey="total" stroke={isDark ? '#06B6D4' : '#6366F1'} strokeWidth={2.5}
                            dot={{ fill: isDark ? '#06B6D4' : '#6366F1', strokeWidth: 0, r: 3 }}
                            animationBegin={400} animationDuration={1000} />
                        </LineChart>
                      )}
                    </ResponsiveContainer></div>
                    {spendingTrendSummary && (
                      <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                        <div className="grid grid-cols-2 gap-2">
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {range === 'month' ? 'Highest Spending Week' : range === 'year' ? 'Highest Spending Month' : 'Highest Spending Month'}
                            </p>
                            <p className={`text-xs font-bold mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {spendingTrendSummary.highest.label}
                              <span className={`text-[10px] font-mono ml-1 ${isDark ? 'text-accent-green' : 'text-green-600'}`}>- ₹{spendingTrendSummary.highest.value.toLocaleString('en-IN')}</span>
                            </p>
                          </div>
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {range === 'month' ? 'Lowest Spending Week' : range === 'year' ? 'Lowest Spending Month' : 'Lowest Spending Month'}
                            </p>
                            <p className={`text-xs font-bold mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {spendingTrendSummary.lowest.label}
                              <span className={`text-[10px] font-mono ml-1 ${isDark ? 'text-accent-red' : 'text-red-500'}`}>- ₹{spendingTrendSummary.lowest.value.toLocaleString('en-IN')}</span>
                            </p>
                          </div>
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {range === 'month' ? 'Average Weekly Spending' : range === 'year' ? 'Average Monthly Spending' : 'Average Monthly Spending'}
                            </p>
                            <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}> 
                              ₹{Math.round(spendingTrendSummary.average).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
                            <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Highest Single Expense</p>
                            <p className={`text-xs font-bold mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {topExpense?.title || topExpense?.category || '—'}
                              <span className={`text-[10px] font-mono ml-1 ${isDark ? 'text-accent-green' : 'text-green-600'}`}>- ₹{(topExpense?.amount || 0).toLocaleString('en-IN')}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                      📈
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No spending data</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====== ROW 4: SETTLEMENTS 65% + ACTIVITY 35% ====== */}
          {(range === 'day' || range === 'week') && (
            <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-3">
              <SettlementsCard settlements={settlements} isDark={isDark} />
              <RecentActivityCard recentActivity={recentActivity} isDark={isDark} />
            </div>
          )}

          {/* MONTH / YEAR / ALL TIME: [Settlement Summary] only */}
          {(range === 'month' || range === 'year' || range === 'all') && (
            <div>
              <SettlementSummaryCard settlements={settlements} isDark={isDark} rangeCaption={rangeCaption} />
            </div>
          )}
        </>
      )}

      {/* ====== MODALS ====== */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-xl font-heading font-semibold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Create New Trip</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input className="input-field" placeholder="Trip Title" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <input className="input-field" placeholder="Destination" value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Start Date</label>
                  <input type="date" className="input-field" value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>End Date</label>
                  <input type="date" className="input-field" value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
                </div>
              </div>
              <textarea className="input-field" placeholder="Description (optional)" rows={3}
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Creating Trip...' : 'Create'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-xl font-heading font-semibold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Join Trip</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <input className={`input-field font-mono text-center text-lg tracking-widest ${isDark ? 'text-white' : ''}`}
                placeholder="Enter invite code" value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={8} required />
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowJoin(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={joining} className="btn-primary">{joining ? 'Joining...' : 'Join'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

// ====== SUB-COMPONENTS ======

function MyTripsCard({ trips, tripsLoading, displayTrips, systemConfig, setShowCreate, isDark, statusColors }) {
  return (
                <div className={`rounded-3xl p-3 lg:p-4 transition-colors h-full flex flex-col ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h3 className={`text-sm font-heading font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>My Trips</h3>
        {trips.length > 3 && (
          <Link to="/trips" className={`text-xs font-medium transition-colors ${isDark ? 'text-accent-blue hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
            View All Trips →
          </Link>
        )}
      </div>
      {tripsLoading ? (
        <div className="flex items-center justify-center flex-1">
          <div className={`w-5 h-5 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-white/[0.15]' : 'border-slate-300'}`} />
        </div>
      ) : trips.length === 0 ? (
        <div className={`flex flex-col items-center justify-center flex-1 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2 text-lg ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
            🗺️
          </div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No trips yet</p>
          <p className={`text-xs mt-0.5 mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {systemConfig.enableTrips ? 'Create your first journey.' : 'Trip creation is disabled.'}
          </p>
          {systemConfig.enableTrips && (
            <button onClick={() => setShowCreate(true)} className="text-xs font-semibold text-accent-blue hover:text-blue-400 transition-colors">
              Create trip →
            </button>
          )}
        </div>
      ) : displayTrips.length === 0 ? (
        <div className={`flex items-center justify-center flex-1 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No active trips to display</p>
        </div>
      ) : displayTrips.length >= 3 ? (
        <div className="flex-1 flex flex-col justify-center space-y-2">
          {displayTrips.map((trip) => (
            <Link key={trip._id} to={`/trips/${trip._id}`}
              className={`block p-2.5 rounded-xl transition-all duration-200 ${isDark
                ? 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04]'
                : 'bg-slate-50/50 hover:bg-slate-100/60 border border-slate-100'
                }`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className={`text-base font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{trip.title}</p>
                  {trip.destination && (
                    <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      📍 {trip.destination}
                    </p>
                  )}
                </div>
                <span className={`badge text-[10px] shrink-0 ml-2 ${statusColors[trip.status] || 'badge-blue'}`}>
                  {trip.status?.toUpperCase() || 'PLANNING'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-[11px]">
                {trip.member_count && (
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                    👥 {trip.member_count} member{trip.member_count !== 1 ? 's' : ''}
                  </span>
                )}
                {trip.total_budget > 0 && (
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                    💰 ₹{(trip.total_budget / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : displayTrips.length === 2 ? (
        <div className="flex-1 flex flex-col gap-2">
          {displayTrips.map((trip) => (
            <Link key={trip._id} to={`/trips/${trip._id}`}
              className={`flex-1 flex flex-col justify-center p-3 rounded-xl transition-all duration-200 ${isDark
                ? 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04]'
                : 'bg-slate-50/50 hover:bg-slate-100/60 border border-slate-100'
                }`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className={`text-base font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{trip.title}</p>
                  {trip.destination && (
                    <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      📍 {trip.destination}
                    </p>
                  )}
                </div>
                <span className={`badge text-[10px] shrink-0 ml-2 ${statusColors[trip.status] || 'badge-blue'}`}>
                  {trip.status?.toUpperCase() || 'PLANNING'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-[11px]">
                {trip.member_count && (
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                    👥 {trip.member_count} member{trip.member_count !== 1 ? 's' : ''}
                  </span>
                )}
                {trip.total_budget > 0 && (
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                    💰 ₹{(trip.total_budget / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <Link key={displayTrips[0]._id} to={`/trips/${displayTrips[0]._id}`}
            className={`flex-[0.55] flex flex-col justify-center p-3 rounded-xl transition-all duration-200 ${isDark
              ? 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04]'
              : 'bg-slate-50/50 hover:bg-slate-100/60 border border-slate-100'
              }`}>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className={`text-base font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayTrips[0].title}</p>
                {displayTrips[0].destination && (
                  <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    📍 {displayTrips[0].destination}
                  </p>
                )}
              </div>
              <span className={`badge text-[10px] shrink-0 ml-2 ${statusColors[displayTrips[0].status] || 'badge-blue'}`}>
                {displayTrips[0].status?.toUpperCase() || 'PLANNING'}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[11px]">
              {displayTrips[0].member_count && (
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                  👥 {displayTrips[0].member_count} member{displayTrips[0].member_count !== 1 ? 's' : ''}
                </span>
              )}
              {displayTrips[0].total_budget > 0 && (
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                   💰 ₹{(displayTrips[0].total_budget / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </Link>
          <div className="flex-1 flex items-center justify-center">
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              You're currently participating in one active trip.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function SettlementsCard({ settlements, isDark }) {
  const hasSettlements = settlements.i_owe?.length > 0 || settlements.owed_to_me?.length > 0
  const totalOwe = settlements.i_owe?.reduce((s, item) => s + item.amount, 0) || 0
  const totalOwed = settlements.owed_to_me?.reduce((s, item) => s + item.amount, 0) || 0
  const oweOverflow = settlements.i_owe?.length > 4 ? settlements.i_owe.length - 4 : 0
  const owedOverflow = settlements.owed_to_me?.length > 4 ? settlements.owed_to_me.length - 4 : 0
  return (
    <div className={`rounded-3xl p-3 lg:p-4 transition-colors h-full flex flex-col ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className={`text-sm font-heading font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Settlements
        </h3>
        {hasSettlements && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-accent-red/10 text-accent-red' : 'bg-red-50 text-red-500'}`}>
            {settlements.i_owe.length + settlements.owed_to_me.length} pending
          </span>
        )}
      </div>
      {hasSettlements ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0">
          <div className={`p-3 rounded-xl flex flex-col min-h-0 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 shrink-0 ${isDark ? 'text-accent-red' : 'text-red-500'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              You Owe
            </h4>
            {settlements.i_owe.length > 0 ? (
              <div className="space-y-1 flex-1 overflow-hidden">
                {settlements.i_owe.slice(0, 4).map((s) => (
                  <div key={s._id} className={`flex items-center justify-between py-1 border-b last:border-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{s.other_user}</p>
                      <p className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.trip_title}</p>
                    </div>
                    <span className={`font-mono text-xs font-bold shrink-0 ml-2 ${isDark ? 'text-accent-red' : 'text-red-500'}`}>
                      ₹{(s.amount / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nothing owed</p>
            )}
            {totalOwe > 0 && (
              <div className={`mt-1.5 pt-1.5 border-t shrink-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total</span>
                  <span className={`text-xs font-bold font-mono ${isDark ? 'text-accent-red' : 'text-red-500'}`}>
            ₹{(totalOwe / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            )}
            {oweOverflow > 0 && (
              <p className={`text-[10px] font-semibold text-center pt-1 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                +{oweOverflow} more
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl flex flex-col min-h-0 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 shrink-0 ${isDark ? 'text-accent-green' : 'text-green-500'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Owed to You
            </h4>
            {settlements.owed_to_me.length > 0 ? (
              <div className="space-y-1 flex-1 overflow-hidden">
                {settlements.owed_to_me.slice(0, 4).map((s) => (
                  <div key={s._id} className={`flex items-center justify-between py-1 border-b last:border-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{s.other_user}</p>
                      <p className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.trip_title}</p>
                    </div>
                    <span className={`font-mono text-xs font-bold shrink-0 ml-2 ${isDark ? 'text-accent-green' : 'text-green-500'}`}>
                      ₹{(s.amount / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nothing owed to you</p>
            )}
            {totalOwed > 0 && (
              <div className={`mt-1.5 pt-1.5 border-t shrink-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total</span>
                  <span className={`text-xs font-bold font-mono ${isDark ? 'text-accent-green' : 'text-green-500'}`}>
                    ₹{(totalOwed / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            )}
            {owedOverflow > 0 && (
              <p className={`text-[10px] font-semibold text-center pt-1 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                +{owedOverflow} more
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 py-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
            🎉
          </div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>You're all settled!</p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No pending settlements.</p>
        </div>
      )}
    </div>
  )
}

function SettlementSummaryCard({ settlements, isDark, rangeCaption }) {
  const totalOwe = settlements.i_owe?.reduce((s, item) => s + item.amount, 0) || 0
  const totalOwed = settlements.owed_to_me?.reduce((s, item) => s + item.amount, 0) || 0
  const pendingCount = (settlements.i_owe?.length || 0) + (settlements.owed_to_me?.length || 0)
  return (
    <div className={`rounded-3xl p-3 lg:p-4 transition-colors ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
      <h3 className={`text-sm font-heading font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Settlement Summary
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total You Owe</p>
          <p className={`text-base lg:text-lg font-bold font-mono ${isDark ? 'text-accent-red' : 'text-red-500'}`}>
             ₹{(totalOwe / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Owed to You</p>
          <p className={`text-base lg:text-lg font-bold font-mono ${isDark ? 'text-accent-green' : 'text-green-500'}`}>
            ₹{(totalOwed / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/50'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Pending Settlements</p>
          <p className={`text-base lg:text-lg font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {pendingCount}
          </p>
        </div>
      </div>
    </div>
  )
}

function RecentActivityCard({ recentActivity, isDark }) {
  const { user } = useAuthStore()
  const getTimeAgo = (dateStr) => {
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

  const getIcon = (act) => {
    const desc = (act.description || '').toLowerCase()
    if (desc.includes('expense')) return '💳'
    if (desc.includes('settlement') || desc.includes('settled')) return '💰'
    if (desc.includes('memory') || desc.includes('photo') || desc.includes('upload')) return '📸'
    if (desc.includes('place') || desc.includes('location')) return '📍'
    if (desc.includes('member') || desc.includes('joined')) return '👥'
    if (desc.includes('trip') && (desc.includes('create') || desc.includes('creat'))) return '🗺️'
    if (desc.includes('invitation') || desc.includes('accepted')) return '✅'
    if (desc.includes('budget')) return '📊'
    if (desc.includes('comment')) return '💬'
    return '📌'
  }

  return (
    <div className={`rounded-3xl p-3 lg:p-4 transition-colors h-full flex flex-col ${isDark ? 'bg-[#111827] border border-white/[0.06]' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className={`text-sm font-heading font-semibold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Recent Activity
        </h3>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
              📋
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No recent activity</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Actions will appear here as you use TripSync.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 space-y-0 overflow-hidden">
              {recentActivity.slice(0, 3).map((act) => (
                <div key={act._id} className={`flex items-start gap-2 py-1 border-b last:border-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-200/50 dark:border-white/10 shadow-xs">
                      {act.actor?.profile_photo_url ? (
                        <img 
                          src={act.actor.profile_photo_url} 
                          alt={act.actor?.full_name || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase">
                          {act.actor?.full_name ? act.actor.full_name.charAt(0) : 'U'}
                        </span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-[8px] bg-white dark:bg-slate-800 rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-xs border border-slate-100 dark:border-slate-700">
                      {getIcon(act)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-snug ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span className="font-semibold">{you(user?._id, act.actor_id, act.actor?.full_name || 'Someone')}</span>
                      <span> {act.description ? act.description.charAt(0).toLowerCase() + act.description.slice(1) : ''}</span>
                      {act.trip_name && !act.description?.toLowerCase().includes(act.trip_name.toLowerCase()) && (
                        <span className={isDark ? 'text-slate-500' : 'text-slate-400'}> in {act.trip_name}</span>
                      )}
                    </p>
                    <p className={`text-[10px] mt-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{getTimeAgo(act.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
            {recentActivity.length > 3 && (
              <Link
                to="/activity"
                className={`block w-full text-center text-xs font-medium pt-1.5 shrink-0 transition-colors ${isDark ? 'text-accent-blue hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
              >
                View All →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
