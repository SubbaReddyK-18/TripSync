import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import useTripStore from '../stores/tripStore'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import useExpenseStore from '../stores/expenseStore'
import { updateTrip, deleteTrip, regenerateCode, updateMemberRole, removeMember, downloadReport } from '../api/trips'
import { getBudgetAnalytics } from '../api/budgets'
import { getBalanceSheet, getMySettlements } from '../api/settlements'
import { getMemories } from '../api/memories'
import { getLocations } from '../api/locations'
import { useRequestLock } from '../hooks/useRequestLock'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { you } from '../utils/displayName'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from '../components/common/Avatar'

const ROLE_LABELS = { admin: 'Host', editor: 'Editor', member: 'Editor', viewer: 'Viewer' }
const ROLE_BADGE = {
  admin: 'bg-accent-amber/15 text-accent-amber',
  editor: 'bg-accent-green/15 text-accent-green',
  member: 'bg-accent-green/15 text-accent-green',
  viewer: 'bg-accent-blue/15 text-accent-blue',
}



const destinationGradients = [
  'from-emerald-500/20 to-teal-600/10',
  'from-blue-500/20 to-indigo-600/10',
  'from-orange-500/20 to-rose-600/10',
  'from-violet-500/20 to-purple-600/10',
  'from-cyan-500/20 to-blue-600/10',
  'from-amber-500/20 to-orange-600/10',
]

const getDestinationGradient = (destination) => {
  let hash = 0
  const str = destination || 'travel'
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return destinationGradients[Math.abs(hash) % destinationGradients.length]
}

export default function TripOverviewPage() {
  const { tripId } = useParams()
  const { user } = useAuthStore()
  const { systemConfig } = useUiStore()
  const { activeTrip, members, activity, fetchTrip, fetchMembers, fetchActivity, isLoading } = useTripStore()
  const { expenses, fetchExpenses } = useExpenseStore()
  const navigate = useNavigate()
  const [deleting, deleteAction] = useRequestLock()
  const [regenerating, regenAction] = useRequestLock()
  const [exporting, exportAction] = useRequestLock()
  const [budgetHealth, setBudgetHealth] = useState(null)
  const [balanceSheet, setBalanceSheet] = useState([])
  const [settlements, setSettlements] = useState({ i_owe: [], owed_to_me: [] })
  const [memories, setMemories] = useState([])
  const [places, setPlaces] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    fetchTrip(tripId)
    fetchMembers(tripId)
    fetchActivity(tripId)
    fetchExpenses(tripId)
    loadBudget()
    loadBalanceSheet()
    loadSettlements()
    if (systemConfig.enableMemories) loadMemories()
    if (systemConfig.enablePlaces) loadPlaces()
  }, [tripId])

  const loadBalanceSheet = async () => {
    try { const { data } = await getBalanceSheet(tripId); setBalanceSheet(data.data.balances) } catch {}
  }
  const loadBudget = async () => {
    try { const { data } = await getBudgetAnalytics(tripId); setBudgetHealth(data.data) } catch {}
  }
  const loadSettlements = async () => {
    try { const { data } = await getMySettlements(tripId); setSettlements(data.data) } catch {}
  }
  const loadMemories = async () => {
    try { const { data } = await getMemories(tripId); setMemories(data.data.memories.slice(0, 6)) } catch {}
  }
  const loadPlaces = async () => {
    try { const { data } = await getLocations(tripId); setPlaces(data.data.locations.slice(0, 6)) } catch {}
  }

  const currentUserRole = members.find((m) => m.user._id === user?._id)?.role
  const isAdmin = currentUserRole === 'admin'
  const canEdit = ['admin', 'editor', 'member'].includes(currentUserRole)

  const handleDelete = async () => {
    if (!confirm('Delete this trip permanently? This cannot be undone.')) return
    await deleteAction(async () => {
      await deleteTrip(tripId); toast.success('Trip deleted'); navigate('/dashboard')
    }).catch((err) => { toast.error(err.response?.data?.error?.message || 'Failed to delete') })
  }

  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleExportReport = async (fmt = 'pdf') => {
    await exportAction(async () => {
      const response = await downloadReport(tripId, fmt)
      const mimeTypes = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv' }
      const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeTypes[fmt] }))
      const link = document.createElement('a'); link.href = url
      const ext = fmt === 'xlsx' ? 'xlsx' : fmt
      link.setAttribute('download', `${activeTrip?.title?.replace(/\s+/g, '_').toLowerCase() || 'trip'}_report.${ext}`)
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url)
      toast.success(`Report downloaded as ${fmt.toUpperCase()}`)
    }).catch((err) => { toast.error(err.response?.data?.error?.message || 'Failed to download report') })
    setExportOpen(false)
  }

  const handleRegenCode = async () => {
    await regenAction(async () => {
      const { data } = await regenerateCode(tripId); toast.success(`New code: ${data.data.invite_code}`); fetchTrip(tripId)
    }).catch((err) => { toast.error(err.response?.data?.error?.message || 'Failed to regenerate') })
  }

  if (isLoading || !activeTrip || activeTrip._id !== tripId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading trip...</p>
        </div>
      </div>
    )
  }

  const pendingSettlementCount = (settlements.i_owe?.filter(s => s.status === 'pending').length || 0) + (settlements.owed_to_me?.filter(s => s.status === 'pending').length || 0)

  const stats = [
    { id: 'overview', label: 'Overview', value: members.length, icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'expenses', label: 'Expenses', value: expenses.length, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'budget', label: 'Budget Used', value: budgetHealth?.budget ? `₹${Math.round((budgetHealth.total_spent / 100))}` : '--', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'members', label: 'Members', value: members.length, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
    ...(systemConfig.enableMemories ? [{ id: 'memories', label: 'Memories', value: memories.length, icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' }] : []),
    ...(systemConfig.enablePlaces ? [{ id: 'places', label: 'Places', value: places.length, icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' }] : []),
    { id: 'settlements', label: 'Pending Settlements', value: pendingSettlementCount, icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              {budgetHealth && renderBudgetHealth()}
              {balanceSheet.length > 0 && renderBalanceSheet()}
            </div>
            <div className="space-y-6">
              {renderActivity()}
            </div>
          </div>
        )
      case 'expenses':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-muted">Recent expenses across the trip</p>
              <Link to={`/trips/${tripId}/expenses`} className="text-sm font-semibold text-accent-blue hover:underline">
                View All →
              </Link>
            </div>
            {expenses.length === 0 ? (
              <div className="card text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-accent-amber/10 flex items-center justify-center mx-auto mb-3 text-2xl">💸</div>
                <p className="text-text-muted font-medium">No expenses yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {expenses.slice(0, 6).map((e) => {
                  const catColors = { food: 'bg-accent-amber/10 text-accent-amber', transport: 'bg-accent-blue/10 text-accent-blue', accommodation: 'bg-accent-green/10 text-accent-green', activity: 'bg-accent-purple/10 text-accent-purple', shopping: 'bg-accent-pink/10 text-accent-pink', medical: 'bg-accent-red/10 text-accent-red', other: 'bg-primary-lighter text-text-muted' }
                  const catEmojis = { food: '🍕', transport: '🚗', accommodation: '🏠', activity: '🎯', shopping: '🛍️', medical: '💊', other: '📋' }
                  const catClass = catColors[e.category] || catColors.other
                  return (
                    <div key={e._id} className="card hover:shadow-elevated transition-all duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${catClass}`}>
                            {catEmojis[e.category] || '📋'}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary text-sm">{e.title}</p>
                            <p className="text-xs text-text-muted">{e.category} · {e.split_type}</p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-text-primary">₹{(e.amount / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border-light text-xs text-text-muted">
                        <span>Paid by {e.paid_by === user?._id ? 'You' : members.find(m => m.user._id === e.paid_by)?.user?.full_name || 'Someone'}</span>
                        <span>{e.created_at ? new Date(e.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : e.date ? new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }) : ''}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      case 'budget':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-muted">Budget overview and analytics</p>
              <Link to={`/trips/${tripId}/budget`} className="text-sm font-semibold text-accent-blue hover:underline">
                Full Analytics →
              </Link>
            </div>
            {budgetHealth?.budget ? (
              <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className={`text-xl font-bold ${
                      budgetHealth.health === 'over_budget' ? 'text-accent-red' :
                      budgetHealth.health === 'at_budget' ? 'text-accent-amber' :
                      budgetHealth.health === 'near_limit' ? 'text-accent-amber' : 'text-accent-green'
                    }`}>
                      {budgetHealth.health === 'over_budget' ? 'Over Budget' :
                       budgetHealth.health === 'at_budget' ? 'Budget Reached' :
                       budgetHealth.health === 'near_limit' ? 'Near Limit' : 'Under Budget'}
                    </div>
                    <p className="text-sm text-text-muted">
                      Spent <span className="font-mono font-bold text-text-primary">₹{(budgetHealth.total_spent / 100).toFixed(2)}</span> of <span className="font-mono font-bold text-text-primary">₹{Math.round(budgetHealth.total_budget / 100)}</span>
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-mono font-bold text-text-muted">
                      <span>Usage</span>
                      <span>{budgetHealth.percentage_used}%</span>
                    </div>
                    <div className="w-full bg-primary-lighter rounded-full h-3 border border-border-light overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${
                        budgetHealth.health === 'over_budget' ? 'bg-accent-red' :
                        budgetHealth.health === 'at_budget' ? 'bg-accent-amber' :
                        budgetHealth.health === 'near_limit' ? 'bg-accent-amber' : 'bg-accent-green'
                      }`} style={{ width: `${Math.min(budgetHealth.percentage_used, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-accent-amber/10 flex items-center justify-center mx-auto mb-3 text-2xl">📊</div>
                <p className="text-text-muted font-medium mb-4">No budget configured yet</p>
                <Link to={`/trips/${tripId}/budget`} className="btn-primary text-sm">Set Budget</Link>
              </div>
            )}
          </div>
        )
      case 'members':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-muted">{members.length} member{members.length !== 1 ? 's' : ''} in this trip</p>
              <button onClick={() => setShowInvite(true)} className="text-sm font-semibold text-accent-blue hover:underline">
                Invite Code →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((m) => (
                <div key={m.user._id} className="card flex items-center gap-4 p-5">
                  <Avatar user={m.user} size="lg" bg="from-accent-blue to-accent-purple" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">{m.user.full_name}</p>
                    <p className="text-xs text-text-muted truncate">@{m.user.username}</p>
                  </div>
                  <span className={`badge shrink-0 font-bold text-[10px] ${ROLE_BADGE[m.role] || ROLE_BADGE.viewer}`}>
                    {ROLE_LABELS[m.role] || m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      case 'memories':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-muted">{memories.length} memory{memories.length !== 1 ? 'ies' : 'y'} captured</p>
              <Link to={`/trips/${tripId}/memories`} className="text-sm font-semibold text-accent-blue hover:underline">
                View All →
              </Link>
            </div>
            {memories.length === 0 ? (
              <div className="card text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-accent-blue/10 flex items-center justify-center mx-auto mb-3 text-2xl">📸</div>
                <p className="text-text-muted font-medium">No memories yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {memories.map((mem) => (
                  <Link key={mem._id} to={`/trips/${tripId}/memories`} className="group relative rounded-2xl overflow-hidden aspect-square">
                    <img src={mem.cloudinary_url} alt={mem.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {mem.caption && <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">{mem.caption}</p>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      case 'places':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-muted">{places.length} place{places.length !== 1 ? 's' : ''} explored</p>
              <Link to={`/trips/${tripId}/places`} className="text-sm font-semibold text-accent-blue hover:underline">
                View All →
              </Link>
            </div>
            {places.length === 0 ? (
              <div className="card text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-accent-amber/10 flex items-center justify-center mx-auto mb-3 text-2xl">📍</div>
                <p className="text-text-muted font-medium">No places recorded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {places.map((loc) => (
                  <div key={loc._id} className="card flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary truncate">{loc.name}</p>
                      <p className="text-xs text-text-muted">{loc.category} · {loc.visit_date?.split('T')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      case 'settlements':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-muted">
                {settlements.i_owe?.filter(s => s.status === 'pending').length > 0 ? `${settlements.i_owe.filter(s => s.status === 'pending').length} pending payment${settlements.i_owe.filter(s => s.status === 'pending').length !== 1 ? 's' : ''}` : 'All settled up'}
              </p>
              <Link to={`/trips/${tripId}/settlements`} className="text-sm font-semibold text-accent-blue hover:underline">
                View All →
              </Link>
            </div>
            {balanceSheet.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {balanceSheet.slice(0, 6).map((entry) => {
                  const isPositive = entry.balance > 0; const isZero = entry.balance === 0
                  return (
                    <div key={entry.user_id} className={`card flex items-center justify-between p-4 ${isPositive ? 'border-accent-green/20' : isZero ? '' : 'border-accent-red/20'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                          isPositive ? 'bg-accent-green/15 text-accent-green' : isZero ? 'bg-text-muted/10 text-text-muted' : 'bg-accent-red/15 text-accent-red'
                        }`}>
                          {entry.full_name?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-text-primary">{you(user?._id, entry.user_id, entry.full_name)}</span>
                      </div>
                      <span className={`font-mono text-sm font-bold ${isPositive ? 'text-accent-green' : isZero ? 'text-text-muted' : 'text-accent-red'}`}>
                        {isPositive ? '+' : ''}{isZero ? '₹0.00' : `₹${(Math.abs(entry.balance) / 100).toFixed(2)}`}
                        {!isZero && (isPositive ? ' (to receive)' : ' (owes)')}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="card text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-accent-green/10 flex items-center justify-center mx-auto mb-3 text-2xl">💰</div>
                <p className="text-text-muted font-medium">No settlements yet</p>
              </div>
            )}
          </div>
        )
    }
  }

  const renderBudgetHealth = () => (
    <div className="card hover:shadow-elevated transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg text-text-primary flex items-center gap-2">
          <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Budget Health
        </h3>
        <Link to={`/trips/${tripId}/budget`} className="text-xs font-semibold text-accent-blue hover:underline">
          View Category Breakdown →
        </Link>
      </div>
      {!budgetHealth.budget ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-text-secondary font-medium">No budget configured for this trip yet.</p>
          <Link to={`/trips/${tripId}/budget`} className="btn-primary text-xs font-semibold inline-block py-1.5 px-4 shadow-sm">Configure Budget</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-2">
            <div className={`text-2xl font-bold ${
              budgetHealth.health === 'over_budget' ? 'text-accent-red' :
              budgetHealth.health === 'at_budget' ? 'text-accent-amber' :
              budgetHealth.health === 'near_limit' ? 'text-accent-amber' : 'text-accent-green'
            }`}>
              {budgetHealth.health === 'over_budget' ? 'Over Budget' :
               budgetHealth.health === 'at_budget' ? 'Budget Reached' :
               budgetHealth.health === 'near_limit' ? 'Near Limit' : 'Under Budget'}
            </div>
            <p className="text-sm text-text-secondary font-medium">
              Spent <span className="font-mono font-bold text-text-primary">₹{(budgetHealth.total_spent / 100).toFixed(2)}</span> of <span className="font-mono font-bold text-text-primary">₹{Math.round(budgetHealth.total_budget / 100)}</span>
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono font-bold text-text-muted">
              <span>Usage</span>
              <span>{budgetHealth.percentage_used}%</span>
            </div>
            <div className="w-full bg-primary-lighter rounded-full h-3 border border-border-light overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                budgetHealth.health === 'over_budget' ? 'bg-accent-red' :
                budgetHealth.health === 'at_budget' ? 'bg-accent-amber' :
                budgetHealth.health === 'near_limit' ? 'bg-accent-amber' : 'bg-accent-green'
              }`} style={{ width: `${Math.min(budgetHealth.percentage_used, 100)}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderBalanceSheet = () => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg text-text-primary flex items-center gap-2">
          <svg className="w-5 h-5 text-accent-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Balance Sheet
        </h3>
        <Link to={`/trips/${tripId}/settlements`} className="text-xs font-semibold text-accent-blue hover:underline">Settle Up →</Link>
      </div>
      <div className="space-y-2">
        {balanceSheet.map((entry) => {
          const isPositive = entry.balance > 0; const isZero = entry.balance === 0
          return (
            <div key={entry.user_id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-primary-lighter/30 border border-border/20">
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isPositive ? 'bg-accent-green/15 text-accent-green' : isZero ? 'bg-text-muted/10 text-text-muted' : 'bg-accent-red/15 text-accent-red'
                }`}>{entry.full_name?.charAt(0)}</div>
                <span className="text-sm font-medium text-text-primary">{you(user?._id, entry.user_id, entry.full_name)}</span>
              </div>
              <span className={`font-mono text-sm font-bold ${isPositive ? 'text-accent-green' : isZero ? 'text-text-muted' : 'text-accent-red'}`}>
                {isPositive ? '+' : ''}{isZero ? '₹0.00' : `₹${(Math.abs(entry.balance) / 100).toFixed(2)}`}
                {!isZero && (isPositive ? ' (to receive)' : ' (owes)')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const getActivityIcon = (description) => {
    const d = (description || '').toLowerCase()
    if (d.includes('expense') && (d.includes('added') || d.includes('create'))) return { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-accent-amber/10', text: 'text-accent-amber' }
    if (d.includes('expense') && (d.includes('edit') || d.includes('update'))) return { icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', bg: 'bg-accent-blue/10', text: 'text-accent-blue' }
    if (d.includes('expense') && d.includes('delet')) return { icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', bg: 'bg-accent-red/10', text: 'text-accent-red' }
    if (d.includes('settlement') || d.includes('settled')) return { icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', bg: 'bg-accent-green/10', text: 'text-accent-green' }
    if (d.includes('memory') || d.includes('photo') || d.includes('upload')) return { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', bg: 'bg-accent-purple/10', text: 'text-accent-purple' }
    if (d.includes('place') || d.includes('location') || d.includes('added')) return { icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', bg: 'bg-accent-blue/10', text: 'text-accent-blue' }
    if (d.includes('member') || d.includes('joined') || d.includes('left')) return { icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', bg: 'bg-accent-indigo/10', text: 'text-accent-indigo' }
    return { icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-primary-lighter', text: 'text-text-muted' }
  }

  const formatActivityTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })
  }

  const renderActivity = () => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg text-text-primary flex items-center gap-2">
          <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Recent Activity
        </h3>
        {activity.length > 0 && (
          <span className="text-xs text-text-muted font-mono">{activity.length} event{activity.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      {activity.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-xl bg-primary-lighter flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-sm text-text-muted font-medium">No activity yet</p>
          <p className="text-xs text-text-muted mt-0.5">Actions will appear here as the trip progresses</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border-light/60" />
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {activity.slice(0, 30).map((a) => {
              const actIcon = getActivityIcon(a.description)
              return (
                <div key={a._id} className="relative pl-9 group">
                  <div className={`absolute left-[9px] top-2 w-3 h-3 rounded-full border-2 border-surface ${actIcon.bg} z-10 flex items-center justify-center`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${actIcon.text}`} />
                  </div>
                  <div className="p-2.5 rounded-xl hover:bg-primary-lighter/40 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-200/50 dark:border-white/10 shadow-xs">
                          {a.actor?.profile_photo_url ? (
                            <img 
                              src={a.actor.profile_photo_url} 
                              alt={a.actor?.full_name || 'User'} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase">
                              {a.actor?.full_name ? a.actor.full_name.charAt(0) : 'U'}
                            </span>
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 text-[8px] bg-white dark:bg-slate-800 rounded-full w-4 h-4 flex items-center justify-center shadow-xs border border-slate-100 dark:border-slate-700">
                          {a.description?.toLowerCase().includes('expense') ? '💳' :
                           a.description?.toLowerCase().includes('settle') ? '💰' :
                           a.description?.toLowerCase().includes('memory') || a.description?.toLowerCase().includes('photo') ? '📸' :
                           a.description?.toLowerCase().includes('place') || a.description?.toLowerCase().includes('location') ? '📍' :
                           a.description?.toLowerCase().includes('member') || a.description?.toLowerCase().includes('joined') ? '👥' : '📌'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary leading-snug">
                          <span className="font-semibold">{you(user?._id, a.actor_id, a.actor?.full_name || 'Someone')}</span>
                          <span className="text-text-muted"> {a.description}</span>
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5 font-medium">{formatActivityTime(a.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )



  return (
    <div className="w-full max-w-full px-6 lg:px-8 space-y-6">
      {/* Hero Banner */}
      <div className={`relative overflow-hidden rounded-[32px] bg-gradient-to-br ${getDestinationGradient(activeTrip.destination)} border border-border/60`}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="relative z-10 p-8 lg:p-10">
          <div className="flex items-start justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-3">
                <span className={`badge text-xs font-semibold border ${statusMeta(activeTrip.status).class} bg-white/10 backdrop-blur-md`}>
                  {statusMeta(activeTrip.status).label}
                </span>
                <span className="text-xs text-white/60 font-mono">Code: {activeTrip.invite_code}</span>
              </div>
              <h1 className="text-h2 lg:text-display-lg text-white font-bold drop-shadow-sm">{activeTrip.title}</h1>
              {activeTrip.destination && (
                <p className="text-lg text-white/90 font-medium flex items-center gap-2 mt-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {activeTrip.destination}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-white/70">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {activeTrip.start_date ? new Date(activeTrip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'Start'} - {activeTrip.end_date ? new Date(activeTrip.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'End'}
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-2 shrink-0">
                <div className="relative" ref={exportRef}>
                  <button onClick={() => setExportOpen(!exportOpen)} disabled={exporting} className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 top-full mt-2 z-30 min-w-[140px] rounded-xl overflow-hidden shadow-lg bg-white dark:bg-[#1e293b] border border-border">
                      {['pdf', 'xlsx', 'csv'].map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => handleExportReport(fmt)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-primary-lighter transition-colors text-text-primary"
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
                {isAdmin && (
                  <>
                    <button onClick={handleRegenCode} disabled={regenerating} className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-xl bg-accent-red/20 backdrop-blur-md border border-accent-red/30 text-white text-sm font-semibold hover:bg-accent-red/30 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {stats.map((stat) => {
          const isActive = activeTab === stat.id
          return (
            <button
              key={stat.id}
              onClick={() => setActiveTab(stat.id)}
              className={`card !p-4 transition-all duration-200 group w-full text-left ${
                isActive
                  ? 'ring-2 ring-accent-green border-accent-green/50 shadow-elevated'
                  : 'hover:shadow-elevated'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 ${
                  isActive ? 'bg-accent-green text-white' : 'bg-accent-green/10 text-accent-green'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold font-mono text-text-primary">{stat.value}</p>
                  <p className={`text-xs font-medium ${isActive ? 'text-accent-green' : 'text-text-muted'}`}>{stat.label}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>



      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>

      {/* Invite Code Modal */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-accent-amber/10 flex items-center justify-center mx-auto text-3xl">🔑</div>
              <h2 className="text-xl font-semibold">Invite Code</h2>
              <p className="text-sm text-text-muted">Share this code with friends to join the trip</p>
              <div className="flex items-center justify-center gap-3 bg-primary-lighter rounded-xl p-4 border border-border">
                <span className="text-2xl font-bold tracking-[0.2em] text-accent-amber font-mono">{activeTrip.invite_code}</span>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(activeTrip.invite_code); toast.success('Copied!') }} className="btn-primary w-full">Copy Code</button>
              <button onClick={() => setShowInvite(false)} className="btn-secondary w-full">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function statusMeta(status) {
  const config = {
    planning: { label: 'Upcoming', class: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' },
    ongoing: { label: 'Active', class: 'bg-accent-green/10 text-accent-green border-accent-green/20' },
    completed: { label: 'Completed', class: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20' },
    cancelled: { label: 'Cancelled', class: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  }
  return config[status] || config.planning
}
