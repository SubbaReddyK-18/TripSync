import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import useExpenseStore from '../stores/expenseStore'
import { createExpense, deleteExpense } from '../api/expenses'
import { createComment, getComments, deleteComment } from '../api/comments'
import { getMembers } from '../api/trips'
import { getBalanceSheet } from '../api/settlements'
import toast from 'react-hot-toast'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import { youName, you } from '../utils/displayName'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from '../components/common/Avatar'

const CATEGORIES = ['food', 'transport', 'accommodation', 'activity', 'shopping', 'medical', 'other']

const CATEGORY_STYLES = {
  food: { bg: 'bg-accent-amber/10', text: 'text-accent-amber', border: 'border-accent-amber/20', icon: '🍕' },
  transport: { bg: 'bg-accent-blue/10', text: 'text-accent-blue', border: 'border-accent-blue/20', icon: '🚗' },
  accommodation: { bg: 'bg-accent-green/10', text: 'text-accent-green', border: 'border-accent-green/20', icon: '🏠' },
  activity: { bg: 'bg-accent-purple/10', text: 'text-accent-purple', border: 'border-accent-purple/20', icon: '🎯' },
  shopping: { bg: 'bg-accent-pink/10', text: 'text-accent-pink', border: 'border-accent-pink/20', icon: '🛍️' },
  medical: { bg: 'bg-accent-red/10', text: 'text-accent-red', border: 'border-accent-red/20', icon: '💊' },
  other: { bg: 'bg-primary-lighter', text: 'text-text-muted', border: 'border-border/30', icon: '📋' },
}

function groupExpensesByDate(expenses) {
  const groups = {}
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const thisWeek = new Date(today); thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay())

  expenses.forEach((e) => {
    const d = e.date ? new Date(e.date) : null
    let key = 'Older'
    if (d && !isNaN(d.getTime())) {
      const ds = d.toDateString()
      if (ds === today.toDateString()) key = 'Today'
      else if (ds === yesterday.toDateString()) key = 'Yesterday'
      else if (d >= thisWeek) key = 'This Week'
      else key = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })
    }
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  const order = ['Today', 'Yesterday', 'This Week']
  const sorted = Object.entries(groups).sort(([a], [b]) => {
    const ai = order.indexOf(a); const bi = order.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1; if (bi !== -1) return 1
    return new Date(b.split(',')[0] || 0) - new Date(a.split(',')[0] || 0)
  })
  return sorted
}

export default function ExpensesPage() {
  const { tripId } = useParams()
  const { expenses, isLoading, fetchExpenses } = useExpenseStore()
  const { user } = useAuthStore()
  const { systemConfig } = useUiStore()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('')
  const [balanceSheet, setBalanceSheet] = useState([])
  const [members, setMembers] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [comments, setComments] = useState({})
  const [loadingComments, setLoadingComments] = useState({})
  const [commentText, setCommentText] = useState({})
  const [form, setForm] = useState({
    title: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0],
    paid_by: user?._id || '', split_type: 'equal', notes: '',
  })
  const [payerAmounts, setPayerAmounts] = useState({})
  const totalAllocatedPayers = useMemo(() => {
    return Object.values(payerAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
  }, [payerAmounts])

  const handlePayerAmountChange = (uid, val) => {
    setPayerAmounts((p) => ({ ...p, [uid]: val }))
  }

  const loadBalanceSheet = async () => {
    try { const { data } = await getBalanceSheet(tripId); setBalanceSheet(data.data.balances) } catch {}
  }

  useEffect(() => {
    fetchExpenses(tripId); loadBalanceSheet()
    getMembers(tripId).then(({ data }) => setMembers(data.data.members)).catch(() => {})
  }, [tripId])

  const getPayerInfo = (paidBy) => {
    if (!paidBy) return 'Someone'
    if (typeof paidBy === 'object' && paidBy !== null && !Array.isArray(paidBy)) {
      const entries = Object.entries(paidBy)
      if (entries.length === 0) return 'Someone'
      const parts = entries.map(([uid, amt]) => {
        const name = uid === user?._id ? 'You' : (members.find((m) => m.user._id === uid)?.user.full_name || 'Someone')
        return `${name} (₹${(amt / 100).toFixed(2)})`
      })
      return parts.join(', ')
    }
    if (paidBy === user?._id) return 'You'
    const member = members.find((m) => m.user._id === paidBy)
    return member ? member.user.full_name : 'Someone'
  }

  const getPayerNameSummary = (paidBy) => {
    if (!paidBy) return 'Someone'
    if (typeof paidBy === 'object' && paidBy !== null && !Array.isArray(paidBy)) {
      const entries = Object.entries(paidBy)
      if (entries.length === 0) return 'Someone'
      if (entries.length === 1) {
        return getPayerInfo(entries[0][0])
      }
      const names = entries.map(([uid]) => {
        return uid === user?._id ? 'You' : (members.find((m) => m.user._id === uid)?.user.full_name || 'Someone')
      })
      return names.join(' + ')
    }
    return getPayerInfo(paidBy)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try { const d = new Date(dateStr); return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) }
    catch { return dateStr }
  }

  const loadComments = async (expenseId) => {
    setLoadingComments((p) => ({ ...p, [expenseId]: true }))
    try { const { data } = await getComments(tripId, { target_type: 'expense', target_id: expenseId }); setComments((p) => ({ ...p, [expenseId]: data.data.comments })) } catch {}
    setLoadingComments((p) => ({ ...p, [expenseId]: false }))
  }

  const toggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null) } else { setExpandedId(id); if (!comments[id]) loadComments(id) }
  }

  const openAddModal = () => {
    setShowAdd(true); setSelectedMembers(members.map((m) => m.user._id))
    setForm((p) => ({ ...p, paid_by: user?._id || '' }))
    if (members.length === 0) getMembers(tripId).then(({ data }) => { const fm = data.data.members; setMembers(fm); setSelectedMembers(fm.map((m) => m.user._id)) }).catch(() => {})
  }

  const toggleMember = (uid) => setSelectedMembers((p) => p.includes(uid) ? p.filter((id) => id !== uid) : [...p, uid])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedMembers.length === 0) { toast.error('Select at least one person for the split'); return }

    let finalPaidBy
    if (form.paid_by === 'multiple') {
      const targetAmount = parseFloat(form.amount)
      if (isNaN(targetAmount) || targetAmount <= 0) {
        toast.error('Please enter a valid expense amount first')
        return
      }
      if (Math.abs(totalAllocatedPayers - targetAmount) > 0.01) {
        toast.error(`The sum of payer contributions (₹${totalAllocatedPayers.toFixed(2)}) must equal the total expense amount (₹${targetAmount.toFixed(2)})`)
        return
      }

      finalPaidBy = {}
      for (const [uid, amtStr] of Object.entries(payerAmounts)) {
        const amt = parseFloat(amtStr) || 0
        if (amt > 0) {
          finalPaidBy[uid] = Math.round(amt * 100)
        }
      }
      if (Object.keys(finalPaidBy).length === 0) {
        toast.error('Please specify at least one contributor with a positive payment amount')
        return
      }
    } else {
      finalPaidBy = form.paid_by
    }

    try {
      await createExpense(tripId, { 
        ...form, 
        amount: Math.round(parseFloat(form.amount) * 100), 
        paid_by: finalPaidBy,
        split_among: selectedMembers 
      })
      toast.success('Expense added'); setShowAdd(false)
      setForm({ title: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0], paid_by: user._id, split_type: 'equal', notes: '' })
      setPayerAmounts({})
      setSelectedMembers([]); fetchExpenses(tripId); loadBalanceSheet()
    } catch (err) { toast.error(err.response?.data?.error?.message || 'Failed to add expense') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return
    try { await deleteExpense(tripId, id); toast.success('Expense deleted'); fetchExpenses(tripId); loadBalanceSheet() }
    catch (err) { toast.error(err.response?.data?.error?.message || 'Failed to delete') }
  }

  const handleComment = async (expenseId) => {
    const text = commentText[expenseId]?.trim(); if (!text) return
    try { await createComment(tripId, { target_type: 'expense', target_id: expenseId, text }); toast.success('Comment added'); setCommentText((p) => ({ ...p, [expenseId]: '' })); loadComments(expenseId) }
    catch (err) { toast.error(err.response?.data?.error?.message || 'Failed') }
  }

  const handleDeleteComment = async (expenseId, commentId) => {
    if (!confirm('Delete this comment?')) return
    try { await deleteComment(tripId, commentId); toast.success('Comment deleted'); loadComments(expenseId) }
    catch (err) { toast.error(err.response?.data?.error?.message || 'Failed') }
  }

  const filtered = filter ? expenses.filter((e) => e.category === filter) : expenses
  const grouped = useMemo(() => groupExpensesByDate(filtered), [filtered])
  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div>
      {!systemConfig.enableExpenses ? (
        <div className="px-4 py-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
          Expense management is currently disabled by the administrator.
          <div className="mt-3"><Link to={`/trips/${tripId}`} className="text-xs text-accent-green hover:underline font-semibold">← Back to Trip Overview</Link></div>
        </div>
      ) : (
      <>
      <div className="mb-4">
        <Link to={`/trips/${tripId}`} className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Trip Overview
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h4 text-text-primary">Expenses</h1>
          <p className="text-sm text-text-muted mt-0.5">{filtered.length} expense{filtered.length !== 1 ? 's' : ''} · ₹{(totalAmount / 100).toFixed(2)} total</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!filter ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' : 'bg-primary-lighter text-text-secondary hover:text-text-primary border border-transparent'}`}>
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all flex items-center gap-1.5 ${filter === cat ? `${CATEGORY_STYLES[cat]?.bg || 'bg-accent-green/10'} ${CATEGORY_STYLES[cat]?.text || 'text-accent-green'} border ${CATEGORY_STYLES[cat]?.border || 'border-accent-green/20'}` : 'bg-primary-lighter text-text-secondary hover:text-text-primary border border-transparent'}`}>
            <span>{CATEGORY_STYLES[cat]?.icon || '📋'}</span> {cat}
          </button>
        ))}
      </div>

      {/* Balance Sheet */}
      {balanceSheet.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-base text-text-primary flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              Running Balances
            </h3>
            <Link to={`/trips/${tripId}/settlements`} className="text-xs font-semibold text-accent-blue hover:underline">Settle Up →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {balanceSheet.map((entry) => {
              const isPositive = entry.balance > 0; const isZero = entry.balance === 0
              return (
                <div key={entry.user_id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${isPositive ? 'bg-accent-green/5 border-accent-green/15' : isZero ? 'bg-primary-lighter/30 border-border/20' : 'bg-accent-red/5 border-accent-red/15'}`}>
                  <span className="text-xs font-medium text-text-primary">{you(user?._id, entry.user_id, entry.full_name)}</span>
                  <span className={`font-mono text-xs font-bold ${isPositive ? 'text-accent-green' : isZero ? 'text-text-muted' : 'text-accent-red'}`}>
                    {isPositive ? '+' : ''}{isZero ? '₹0' : `₹${(Math.abs(entry.balance) / 100).toFixed(0)}`}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="text-center py-20 text-text-muted">Loading expenses...</div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-accent-amber/20 to-accent-orange/20 flex items-center justify-center mx-auto mb-4 text-3xl">💸</div>
          <p className="text-text-muted text-lg font-medium mb-1">{filter ? 'No expenses in this category' : 'No expenses yet'}</p>
          <p className="text-text-muted text-sm">{filter ? 'Try a different filter' : 'Add your first expense to start tracking'}</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-text-primary">{dateLabel}</h3>
                <div className="h-px flex-1 bg-border-light" />
                <span className="text-xs text-text-muted font-mono">{items.length} expense{items.length !== 1 ? 's' : ''} · ₹{(items.reduce((s, e) => s + e.amount, 0) / 100).toFixed(0)}</span>
              </div>
              <div className="relative">
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border-light/80" />
                <div className="space-y-4">
                  {items.map((expense) => {
                    const catStyle = CATEGORY_STYLES[expense.category] || CATEGORY_STYLES.other
                    const isExpanded = expandedId === expense._id
                    return (
                      <motion.div
                        key={expense._id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative pl-10"
                      >
                        <div className={`absolute left-[13px] top-5 w-3 h-3 rounded-full border-2 ${catStyle.border} bg-surface z-10`} />
                        <div
                          className={`card !p-4 cursor-pointer transition-all duration-200 hover:shadow-elevated ${isExpanded ? 'ring-1 ring-accent-green/20' : ''}`}
                          onClick={() => toggleExpand(expense._id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${catStyle.bg} ${catStyle.text}`}>
                                {catStyle.icon}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-text-primary text-sm truncate">{expense.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`badge text-[10px] ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>{expense.category}</span>
                                  <span className="text-xs text-text-muted">{expense.split_type} · {getPayerNameSummary(expense.paid_by)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="font-mono font-bold text-text-primary">₹{(expense.amount / 100).toFixed(2)}</p>
                                {expense.notes && <p className="text-[10px] text-text-muted mt-0.5 max-w-[120px] truncate">{expense.notes}</p>}
                              </div>
                              <div className="flex flex-col items-center gap-0.5">
                                <svg className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                {expense.created_by === user._id && (
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(expense._id) }}
                                    className="text-text-muted hover:text-accent-red transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border pt-3 mt-3 space-y-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="bg-primary-lighter/30 rounded-xl p-3.5 space-y-3 border border-border/30">
                                    <div className="flex flex-col gap-1 text-xs border-b border-border/10 pb-2.5">
                                      <span className="text-text-muted font-medium">Paid By</span>
                                      <span className="font-semibold text-text-primary bg-primary-lighter/80 px-2.5 py-1.5 rounded-md border border-border/20 break-words">{getPayerInfo(expense.paid_by)}</span>
                                    </div>
                                    {expense.created_at && (
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-text-muted">Date & Time</span>
                                        <span className="font-semibold text-text-primary">{new Date(expense.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</span>
                                      </div>
                                    )}
                                    <div className="border-t border-border/20 my-2" />
                                    <div className="space-y-2">
                                      <span className="text-xs text-text-muted block font-medium">Split Among ({expense.splits?.length || 0} members):</span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {expense.splits?.map((split) => {
                                          const name = getPayerInfo(split.user_id)
                                          return (
                                            <div key={split.user_id} className="flex justify-between items-center bg-primary/40 rounded-lg p-2.5 border border-border/15 text-xs">
                                              <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-accent-blue/15 flex items-center justify-center text-[10px] font-bold text-accent-blue">{name.charAt(0)}</div>
                                                <span className="text-text-secondary font-medium">{name}</span>
                                              </div>
                                              <span className="font-mono text-text-primary font-semibold">₹{(split.amount / 100).toFixed(2)}</span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-text-secondary">Comments</h4>
                                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                                      {loadingComments[expense._id] ? (
                                        <p className="text-xs text-text-muted">Loading comments...</p>
                                      ) : comments[expense._id]?.length === 0 ? (
                                        <p className="text-xs text-text-muted italic">No comments yet</p>
                                      ) : (
                                        comments[expense._id]?.map((c) => (
                                          <div key={c._id} className="flex items-start gap-2 text-xs">
                                            {c.author?.profile_photo_url ? (
                                              <img src={c.author.profile_photo_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                                            ) : (
                                              <div className="w-5 h-5 rounded-full bg-accent-blue/20 flex items-center justify-center text-[9px] font-bold text-accent-blue shrink-0">{c.author?.full_name?.charAt(0) || '?'}</div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <span className="font-semibold text-text-primary">{youName(user?._id, c.author)}</span>
                                              <span className="text-text-secondary"> {c.is_deleted ? '[deleted]' : c.text}</span>
                                              <span className="block text-[10px] text-text-muted mt-0.5">{new Date(c.created_at).toLocaleString(undefined, { timeZone: 'Asia/Kolkata' })}</span>
                                            </div>
                                            {c.author_id === user?._id && !c.is_deleted && (
                                              <button onClick={() => handleDeleteComment(expense._id, c._id)} className="text-text-muted hover:text-accent-red shrink-0">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                              </button>
                                            )}
                                          </div>
                                        ))
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <input className="input-field text-xs flex-1" placeholder="Write a comment..."
                                        value={commentText[expense._id] || ''}
                                        onChange={(e) => setCommentText((p) => ({ ...p, [expense._id]: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleComment(expense._id) }} />
                                      <button onClick={() => handleComment(expense._id)} className="btn-primary text-xs px-3 py-1.5" disabled={!commentText[expense._id]?.trim()}>Post</button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      <AnimatePresence>
      {showAdd && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAdd(false)}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-6">Add Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input className="input-field" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Amount (INR)</label>
                  <input type="number" className="input-field font-mono" placeholder="0.00" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Date</label>
                  <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Category</label>
                  <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Who paid?</label>
                  <select className="input-field" value={form.paid_by} onChange={(e) => setForm({ ...form, paid_by: e.target.value })} required>
                    {members.length === 0 ? (
                      <option value={user?._id}>You ({user?.username})</option>
                    ) : (
                      <>
                        {members.map((m) => (
                          <option key={m.user._id} value={m.user._id}>
                            {m.user._id === user?._id ? `You (${user?.username})` : m.user.full_name}
                          </option>
                        ))}
                        <option value="multiple">Multiple People...</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {form.paid_by === 'multiple' && (
                <div className="bg-primary-lighter/30 p-4 rounded-xl border border-border/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary">Payer Contributions (INR)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const amt = parseFloat(form.amount || 0)
                        if (amt > 0 && selectedMembers.length > 0) {
                          const share = (amt / selectedMembers.length).toFixed(2)
                          const newAmounts = {}
                          selectedMembers.forEach((uid) => {
                            newAmounts[uid] = share
                          })
                          setPayerAmounts(newAmounts)
                        }
                      }}
                      className="text-[10px] font-semibold text-accent-green hover:underline"
                      disabled={!form.amount || selectedMembers.length === 0}
                    >
                      Auto-distribute
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {members.map((m) => (
                      <div key={m.user._id} className="flex items-center gap-3 bg-primary-lighter/10 p-2 rounded-lg border border-border/15">
                        {m.user?.profile_photo_url ? (
                          <img src={m.user.profile_photo_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-accent-blue/15 flex items-center justify-center text-[10px] font-bold text-accent-blue shrink-0">
                            {m.user.full_name?.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs font-medium text-text-primary truncate flex-1">{m.user._id === user?._id ? 'You' : m.user.full_name}</span>
                        <input
                          type="number"
                          className="input-field font-mono text-xs w-28 !py-1 text-right"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={payerAmounts[m.user._id] || ''}
                          onChange={(e) => handlePayerAmountChange(m.user._id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs font-semibold pt-2 border-t border-border/20">
                    <span className="text-text-muted">Total Paid:</span>
                    <span className={Math.abs(totalAllocatedPayers - parseFloat(form.amount || 0)) < 0.01 ? 'text-accent-green' : 'text-accent-red'}>
                      ₹{totalAllocatedPayers.toFixed(2)} / ₹{parseFloat(form.amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Split Among</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {members.map((m) => (
                    <label key={m.user._id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-primary-lighter transition-colors">
                      <input type="checkbox" checked={selectedMembers.includes(m.user._id)} onChange={() => toggleMember(m.user._id)}
                        className="w-4 h-4 rounded border-border bg-primary text-accent-green focus:ring-accent-green" />
                      {m.user?.profile_photo_url ? (
                        <img src={m.user.profile_photo_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-accent-blue/20 flex items-center justify-center text-xs font-semibold text-accent-blue">{m.user.full_name?.charAt(0)}</div>
                      )}
                      <span className="text-sm">{m.user._id === user?._id ? 'You' : m.user.full_name}</span>
                      <span className="text-xs text-text-muted ml-auto">@{m.user.username}</span>
                    </label>
                  ))}
                </div>
              </div>
              <textarea className="input-field" placeholder="Notes (optional)" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Expense</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
    )}
    </div>
  )
}
