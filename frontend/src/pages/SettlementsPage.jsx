import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMySettlements, paySettlement, getSettlements } from '../api/settlements'
import { getMembers } from '../api/trips'
import { useRequestLock } from '../hooks/useRequestLock'
import toast from 'react-hot-toast'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import { you } from '../utils/displayName'
import { motion, AnimatePresence } from 'framer-motion'

const fmtTime = (iso) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  } catch { return '' }
}

export default function SettlementsPage() {
  const { tripId } = useParams()
  const { user } = useAuthStore()
  const { systemConfig } = useUiStore()
  const [paying, payAction] = useRequestLock()
  const [data, setData] = useState({ i_owe: [], owed_to_me: [], all: [] })
  const [loading, setLoading] = useState(true)
  const [userMap, setUserMap] = useState({})

  useEffect(() => { load() }, [tripId])

  const load = async () => {
    setLoading(true)
    try {
      const [myRes, allRes, membersRes] = await Promise.all([getMySettlements(tripId), getSettlements(tripId), getMembers(tripId)])
      const map = {}
      membersRes.data.data.members.forEach((m) => { map[m.user._id] = m.user.full_name || m.user.username })
      setUserMap(map)
      setData({ i_owe: myRes.data.data.i_owe || [], owed_to_me: myRes.data.data.owed_to_me || [], all: allRes.data.data.settlements || [] })
    } catch {}
    setLoading(false)
  }

  const handlePay = async (id) => {
    await payAction(async () => {
      await paySettlement(tripId, id, {}); toast.success('Payment settled'); load()
    }).catch((err) => { toast.error(err.response?.data?.error?.message || 'Failed') })
  }

  const totalPending = data.i_owe.filter(s => s.status === 'pending').length + data.owed_to_me.filter(s => s.status === 'pending').length
  const totalOwed = data.i_owe.reduce((s, x) => s + (x.status === 'pending' ? x.amount : 0), 0)
  const totalToReceive = data.owed_to_me.reduce((s, x) => s + (x.status === 'pending' ? x.amount : 0), 0)

  if (loading) return (
    <div>
      <div className="mb-4">
        <Link to={`/trips/${tripId}`} className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Trip Overview
        </Link>
      </div>
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading settlements...</p>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {!systemConfig.enableSettlements ? (
        <div className="px-4 py-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
          Settlements are currently disabled by the administrator.
          <div className="mt-3"><Link to={`/trips/${tripId}`} className="text-xs text-accent-green hover:underline font-semibold">← Back to Trip Overview</Link></div>
        </div>
      ) : (
      <>
      <div className="mb-4">
        <Link to={`/trips/${tripId}`} className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Trip Overview
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h4 text-text-primary">Settlements</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {totalPending > 0 ? `${totalPending} pending settlement${totalPending !== 1 ? 's' : ''}` : 'All settled up ✨'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="card border-accent-red/20 !p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-red/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">You Owe</p>
              <p className="text-xl font-mono font-bold text-accent-red">₹{(totalOwed / 100).toFixed(2)}</p>
              <p className="text-xs text-text-muted">{data.i_owe.filter(s => s.status === 'pending').length} pending</p>
            </div>
          </div>
        </div>
        <div className="card border-accent-green/20 !p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">Owed to You</p>
              <p className="text-xl font-mono font-bold text-accent-green">₹{(totalToReceive / 100).toFixed(2)}</p>
              <p className="text-xs text-text-muted">{data.owed_to_me.filter(s => s.status === 'pending').length} pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Settlements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {renderSection('You Owe', 'owe', 'text-accent-red', 'bg-accent-red/5', 'border-accent-red/10', data.i_owe, data.owed_to_me)}
        {renderSection('Owed to You', 'owed', 'text-accent-green', 'bg-accent-green/5', 'border-accent-green/10', data.owed_to_me, data.i_owe)}
      </div>

      {/* All Settlements Timeline */}
      <div className="card">
        <h3 className="font-heading text-base text-text-primary mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          All Settlements
        </h3>
        {data.all.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-accent-green/10 flex items-center justify-center mx-auto mb-3 text-2xl">💰</div>
            <p className="text-text-muted font-medium">No settlements yet</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border-light" />
            <div className="space-y-4">
              {data.all.map((s) => {
                const isPending = s.status === 'pending'
                const fromLabel = you(user?._id, s.from_user_id, userMap[s.from_user_id] || s.from_user_id.slice(-6))
                const toLabel = you(user?._id, s.to_user_id, userMap[s.to_user_id] || s.to_user_id.slice(-6))
                return (
                  <motion.div
                    key={s._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative pl-10"
                  >
                    <div className={`absolute left-[13px] top-5 w-3 h-3 rounded-full border-2 ${isPending ? 'border-accent-amber' : 'border-accent-green'} bg-surface z-10`} />
                    <div className={`border rounded-xl p-4 transition-colors ${isPending ? 'border-accent-amber/20 bg-accent-amber/5' : 'border-accent-green/20 bg-accent-green/5'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-xs font-bold text-accent-blue shrink-0">
                              {fromLabel === 'You' ? user?.full_name?.charAt(0) : userMap[s.from_user_id]?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm font-semibold text-text-primary">{fromLabel}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-text-muted">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-accent-purple/10 flex items-center justify-center text-xs font-bold text-accent-purple shrink-0">
                              {toLabel === 'You' ? user?.full_name?.charAt(0) : userMap[s.to_user_id]?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm font-semibold text-text-primary">{toLabel}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="font-mono font-bold text-text-primary">₹{(s.amount / 100).toFixed(2)}</p>
                            <span className={`text-[10px] font-semibold ${isPending ? 'text-accent-amber' : 'text-accent-green'}`}>
                              {isPending ? 'Pending' : 'Settled'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-text-muted">
                        <span>{s.status === 'settled' ? `Settled ${fmtTime(s.paid_at)}` : `Created ${fmtTime(s.created_at)}`}</span>
                        {isPending && s.from_user_id === user?._id && (
                          <button onClick={() => handlePay(s._id)} disabled={paying} className="btn-primary text-[10px] py-1 px-3">{paying ? 'Paying...' : 'Mark Paid'}</button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
    )}
    </div>
  )

  function renderSection(title, direction, color, bgColor, borderColor, items, otherItems) {
    const pending = items.filter(s => s.status === 'pending')
    const settled = [...items.filter(s => s.status === 'settled')].sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
    const totalPendingAmount = pending.reduce((s, x) => s + x.amount, 0)
    const emptySettled = settled[0]

    return (
      <div className={`card border ${borderColor}`}>
        <h3 className={`font-semibold ${color} mb-4 flex items-center gap-2 text-sm`}>
          <span className={`w-2 h-2 rounded-full ${color.replace('text', 'bg')}`} />
          {title}
          {pending.length > 0 && (
            <span className="ml-auto text-xs font-mono text-text-muted">{pending.length} pending</span>
          )}
        </h3>
        {pending.length > 0 ? (
          <div className="space-y-3">
            {pending.map((s) => renderSettlementCard(s, direction))}
          </div>
        ) : settled.length > 0 ? (
          <div>
            <div className="opacity-50 pointer-events-none">
              {renderSettlementCard(settled[0], direction)}
            </div>
            <p className="text-center text-[11px] text-text-muted mt-2 font-medium">All settled — last settlement shown above</p>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-primary-lighter flex items-center justify-center mx-auto mb-2 text-lg">✨</div>
            <p className="text-text-muted text-sm">Nothing here yet</p>
          </div>
        )}
      </div>
    )
  }

  function renderSettlementCard(s, direction) {
    const isIOwe = direction === 'owe'
    const otherId = isIOwe ? s.to_user_id : s.from_user_id
    const otherLabel = isIOwe ? 'to' : 'from'
    const statusIcon = s.status === 'settled' ? '✅' : '⏳'
    const isPending = s.status === 'pending'
    return (
      <div key={s._id} className={`border rounded-xl p-4 transition-all ${isPending ? 'border-accent-amber/20' : 'border-accent-green/20'} ${isPending ? 'hover:shadow-elevated' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-text-muted font-medium capitalize">{otherLabel}</span>
              <span className="font-semibold text-text-primary truncate">{you(user?._id, otherId, userMap[otherId] || 'Unknown')}</span>
            </div>
            <p className={`font-mono text-xl font-bold ${isPending ? 'text-text-primary' : 'text-accent-green'}`}>
              {statusIcon} ₹{(s.amount / 100).toFixed(2)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`badge text-[10px] font-semibold ${isPending ? 'bg-accent-amber/10 text-accent-amber' : 'bg-accent-green/10 text-accent-green'}`}>
              {s.status === 'settled' ? 'Settled' : 'Pending'}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-text-muted">
          <span>{s.status === 'settled' ? `Settled ${fmtTime(s.paid_at)}` : `Created ${fmtTime(s.created_at)}`}</span>
            {isPending && isIOwe && (
            <button onClick={() => handlePay(s._id)} disabled={paying} className="btn-primary text-[10px] py-1.5 px-3.5">{paying ? 'Paying...' : 'Paid'}</button>
          )}
        </div>
      </div>
    )
  }
}
