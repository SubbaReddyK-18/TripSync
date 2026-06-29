import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getBudgetAnalytics, createBudget, updateBudget, getBudgetHistory } from '../api/budgets'
import { downloadReport } from '../api/trips'
import { useRequestLock } from '../hooks/useRequestLock'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#4ade80', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#34d399']

const healthConfig = {
  under_budget: { label: 'Under Budget', class: 'text-accent-green', bar: 'bg-accent-green', icon: '✅' },
  near_limit: { label: 'Near Limit', class: 'text-accent-amber', bar: 'bg-accent-amber', icon: '⚠️' },
  at_budget: { label: 'Budget Reached', class: 'text-accent-amber', bar: 'bg-accent-amber', icon: '⚡' },
  over_budget: { label: 'Over Budget', class: 'text-accent-red', bar: 'bg-accent-red', icon: '🚨' },
}

const stagger = { animate: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 15 } } }

export default function BudgetPage() {
  const { tripId } = useParams()
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, saveBudget] = useRequestLock()
  const [showModal, setShowModal] = useState(false)
  const [isUpdate, setIsUpdate] = useState(false)
  const [form, setForm] = useState({ total_amount: '', reason: '' })

  useEffect(() => { load() }, [tripId])

  const load = async () => {
    setLoading(true)
    try {
      const [analyticsRes, historyRes] = await Promise.all([getBudgetAnalytics(tripId), getBudgetHistory(tripId)])
      setData(analyticsRes.data.data)
      setHistory(historyRes.data.data.history || [])
    } catch {}
    setLoading(false)
  }

  const openCreate = () => { setIsUpdate(false); setForm({ total_amount: '', reason: '' }); setShowModal(true) }
  const openUpdate = () => { setIsUpdate(true); setForm({ total_amount: (data?.budget?.total_amount / 100).toString(), reason: '' }); setShowModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await saveBudget(async () => {
      const payload = { total_amount: Math.round(parseFloat(form.total_amount) * 100) }
      if (isUpdate) { const reason = (form.reason || '').trim(); if (reason) payload.reason = reason; await updateBudget(tripId, payload); toast.success('Budget updated') }
      else { await createBudget(tripId, payload); toast.success('Budget created') }
      setShowModal(false); load()
    }).catch((err) => { toast.error(err.response?.data?.error?.message || 'Failed') })
  }

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
          <p className="text-text-muted text-sm">Loading budget...</p>
        </div>
      </div>
    </div>
  )

  const health = data?.budget ? healthConfig[data.health] || healthConfig.under_budget : null

  return (
    <div>
      <div className="mb-4">
        <Link to={`/trips/${tripId}`} className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Trip Overview
        </Link>
      </div>

      <div className="flex items-start lg:items-center justify-between mb-4 lg:mb-6">
        <div>
          <h1 className="text-h4 text-text-primary">Budget</h1>
          <p className="text-xs lg:text-sm text-text-muted mt-0.5">
            {data?.budget ? `${health?.icon} ${health?.label} · ${data.percentage_used}% used` : 'Set a budget to track spending'}
          </p>
        </div>
        <div className="flex gap-1.5 lg:gap-2 shrink-0">
          {data?.budget ? (
            <button onClick={openUpdate} className="btn-secondary text-xs lg:text-sm flex items-center gap-1 lg:gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-2">
              <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Update
            </button>
          ) : (
            <button onClick={openCreate} className="btn-primary text-xs lg:text-sm flex items-center gap-1 lg:gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-2">
              <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Set Budget
            </button>
          )}

        </div>
      </div>

      {data?.budget ? (
        <motion.div initial="initial" animate="animate" variants={stagger} className="space-y-6">
          {/* Budget Health Hero */}
          <motion.div variants={fadeUp} className={`card border-2 ${data.health === 'over_budget' ? 'border-accent-red/20' : data.health === 'near_limit' || data.health === 'at_budget' ? 'border-accent-amber/20' : 'border-accent-green/20'}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-6">
              <div className="md:col-span-1 space-y-1 lg:space-y-2">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Budget Health</p>
                <p className={`text-xl lg:text-2xl font-bold ${health?.class || 'text-accent-green'}`}>{health?.icon} {health?.label}</p>
              </div>
              <div className="md:col-span-3 space-y-2 lg:space-y-3">
                <div className="grid grid-cols-3 gap-2 lg:gap-4">
                  <div>
                    <p className="text-xs text-text-muted font-medium">Total Budget</p>
                    <p className="text-base lg:text-xl font-mono font-bold text-text-primary">₹{Math.round(data.total_budget / 100).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted font-medium">Spent</p>
                    <p className={`text-base lg:text-xl font-mono font-bold ${data.health === 'over_budget' ? 'text-accent-red' : 'text-accent-amber'}`}>₹{(data.total_spent / 100).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted font-medium">Remaining</p>
                    <p className={`text-base lg:text-xl font-mono font-bold ${data.health === 'over_budget' ? 'text-accent-red' : 'text-accent-green'}`}>
                      {data.total_budget - data.total_spent > 0 ? `₹${((data.total_budget - data.total_spent) / 100).toLocaleString()}` : '₹0'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 lg:space-y-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold text-text-muted">
                    <span>{data.percentage_used}% used</span>
                    <span>{Math.min(data.percentage_used, 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-primary-lighter rounded-full h-2.5 lg:h-4 border border-border-light overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(data.percentage_used, 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${health?.bar || 'bg-accent-green'} relative`}
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', animation: 'shimmer 2s infinite' }} />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <motion.div variants={fadeUp} className="card lg:col-span-2">
              <h3 className="font-heading text-base text-text-primary mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Category Breakdown
              </h3>
              <div className="h-[200px] lg:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.category_spending.map((c) => ({ ...c, total: c.total / 100 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="category" stroke="var(--color-text-muted)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: 12 }} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {data.category_spending.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="card">
              <h3 className="font-heading text-base text-text-primary mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>
                Spent vs Remaining
              </h3>
              <div className="flex items-center justify-center">
                <div className="h-[180px] lg:h-[240px] w-full max-w-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: 'Spent', value: data.total_spent / 100 },
                        { name: 'Remaining', value: Math.max(0, (data.total_budget - data.total_spent) / 100) },
                      ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" startAngle={90} endAngle={-270}>
                        <Cell fill={data.health === 'over_budget' ? '#f87171' : data.health === 'near_limit' ? '#fbbf24' : '#4ade80'} />
                        <Cell fill="var(--color-border)" />
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 lg:gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent-green" />
                  <span className="text-text-muted">Spent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
                  <span className="text-text-muted">Remaining</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Daily Spending */}
          {data?.daily_spending?.length > 0 && (
            <motion.div variants={fadeUp} className="card">
              <h3 className="font-heading text-base text-text-primary mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-accent-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                Daily Spending
              </h3>
              <div className="h-[180px] lg:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.daily_spending.map((d) => ({ ...d, amount: d.amount / 100 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" stroke="var(--color-text-muted)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="amount" stroke="#60a5fa" strokeWidth={2.5} dot={{ fill: '#60a5fa', r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Top Spenders + History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {data?.top_spenders?.length > 0 && (
              <motion.div variants={fadeUp} className="card">
                <h3 className="font-heading text-base text-text-primary mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Top Spenders
                </h3>
                <div className="space-y-2 lg:space-y-3">
                  {data.top_spenders.map((s, i) => (
                    <div key={s.user._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary-lighter/30 transition-colors">
                      {s.user?.profile_photo_url ? (
                        <img src={s.user.profile_photo_url} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-border shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}>
                          {s.user.full_name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{s.user.full_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted font-mono">#{i + 1}</span>
                        <span className="font-mono font-bold text-accent-amber">₹{(s.total / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {history.length > 0 && (
              <motion.div variants={fadeUp} className="card">
                <h3 className="font-heading text-base text-text-primary mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Budget History
                </h3>
                <div className="relative">
                  <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border-light" />
                  <div className="space-y-3 lg:space-y-5">
                    {history.map((h, i) => {
                      const date = h.updated_at ? new Date(h.updated_at) : null
                      const day = date ? date.getDate() : ''; const month = date ? date.toLocaleString('en-US', { month: 'short' }) : ''
                      return (
                        <div key={i} className="relative pl-8 lg:pl-10">
                          <div className="absolute left-[9px] lg:left-[13px] top-1.5 w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full border-2 border-accent-green bg-surface" />
                          <div className="border border-border/30 rounded-xl p-3 lg:p-4 bg-primary-lighter/20 hover:bg-primary-lighter/40 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-accent-green font-mono">{month} {day}</span>
                              <span className="text-xs text-text-muted">by</span>
                              <span className="text-xs font-semibold text-text-primary">{h.updated_by_name || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm text-accent-red line-through">₹{(h.old_amount / 100).toFixed(0)}</span>
                              <svg className="w-5 h-5 text-accent-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                              <span className="font-mono text-lg font-bold text-accent-green">₹{(h.new_amount / 100).toFixed(0)}</span>
                            </div>
                            {h.reason && <p className="text-xs text-text-secondary mt-2 italic">"{h.reason}"</p>}
                            {date && <p className="text-[10px] text-text-muted mt-2 font-mono">{date.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card text-center py-10 lg:py-20 border-dashed border-2 border-border/80">
          <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl bg-gradient-to-br from-accent-amber/20 to-accent-orange/20 flex items-center justify-center mx-auto mb-4 lg:mb-5 text-2xl lg:text-4xl">📊</div>
          <h2 className="text-h5 text-text-primary mb-2">No budget limit set</h2>
          <p className="text-body-sm text-text-muted max-w-md mx-auto mb-6 leading-relaxed">
            Set an overall budget limit for this trip to monitor spending velocity, visualize categories, and avoid overspending.
          </p>
          <button onClick={openCreate} className="btn-primary shadow-lg shadow-accent-amber/20">Set Overall Budget</button>
        </motion.div>
      )}

      <AnimatePresence>
      {showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6">{isUpdate ? 'Update Budget' : 'Set Budget'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Total Budget (INR)</label>
                <input type="number" className="input-field font-mono" placeholder="e.g. 40000" value={form.total_amount} onChange={(e) => setForm({ total_amount: e.target.value })} required min="1" step="1" />
              </div>
              {isUpdate && (
                <>
                  <div className="bg-accent-amber/5 border border-accent-amber/20 rounded-lg p-3 text-xs text-text-secondary leading-relaxed">
                    Updating the budget will not affect expenses, balances, settlements, or spending history. Only budget analytics and remaining budget calculations will be updated.
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Reason (optional)</label>
                    <input type="text" className="input-field" placeholder="e.g. Added sightseeing activities" value={form.reason} onChange={(e) => setForm({ reason: e.target.value })} maxLength={500} />
                  </div>
                </>
              )}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : (isUpdate ? 'Update Budget' : 'Set Budget')}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
