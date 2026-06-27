import { useState, useEffect, useRef } from 'react'
import { getActivityLogs, getActionTypes, getAdminUsers, exportActivityLogs } from '../api/admin'
import useAuthStore from '../stores/authStore'
import toast from 'react-hot-toast'

const ACTION_LABELS = {
  TRIP_CREATED: 'Created Trip',
  TRIP_UPDATED: 'Updated Trip',
  TRIP_DELETED: 'Deleted Trip',
  EXPENSE_ADDED: 'Added Expense',
  EXPENSE_UPDATED: 'Updated Expense',
  EXPENSE_DELETED: 'Deleted Expense',
  SETTLEMENT_COMPLETED: 'Settlement Completed',
  MEMORY_ADDED: 'Added Memory',
  MEMORY_DELETED: 'Deleted Memory',
  PLACE_ADDED: 'Added Place',
  PLACE_DELETED: 'Deleted Place',
  ITINERARY_ITEM_ADDED: 'Added Itinerary',
  ITINERARY_ITEM_UPDATED: 'Updated Itinerary',
  ITINERARY_ITEM_DELETED: 'Deleted Itinerary',
  USER_REGISTERED: 'User Registered',
  PROFILE_UPDATED: 'Updated Profile',
  PASSWORD_CHANGED: 'Changed Password',
}

export default function AdminActivityLogsPage() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionTypes, setActionTypes] = useState([])
  const [search, setSearch] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

  useEffect(() => {
    getActionTypes().then(({ data }) => setActionTypes(data.data.action_types)).catch(() => {})
    getAdminUsers().then(({ data }) => setAllUsers(data.data.users)).catch(() => {})
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 50 }
      if (search) params.search = search
      if (userFilter) params.userId = userFilter
      if (actionFilter) params.actionType = actionFilter
      if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString()
      if (dateTo) params.dateTo = new Date(dateTo + 'T23:59:59').toISOString()
      const { data } = await getActivityLogs(params)
      setLogs(data.data.logs)
      setTotal(data.data.total)
      setTotalPages(data.data.total_pages)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadLogs() }, [page])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadLogs()
  }

  const resetFilters = () => {
    setSearch('')
    setUserFilter('')
    setActionFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const handleExport = async (fmt) => {
    try {
      const params = { format: fmt }
      if (search) params.search = search
      if (userFilter) params.userId = userFilter
      if (actionFilter) params.actionType = actionFilter
      if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString()
      if (dateTo) params.dateTo = new Date(dateTo + 'T23:59:59').toISOString()
      const { data } = await exportActivityLogs(params)
      const blob = new Blob([data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `activity_logs.${fmt === 'xlsx' ? 'xlsx' : fmt}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Activity logs exported as ${fmt.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    }
    setExportOpen(false)
  }

  useEffect(() => {
    const handleClick = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const formatTime = (iso) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  }

  const getActionBadge = (type) => {
    const base = 'badge text-[10px]'
    if (type?.includes('CREATED') || type?.includes('ADDED') || type === 'USER_REGISTERED') return `${base} badge-green`
    if (type?.includes('UPDATED') || type === 'PROFILE_UPDATED' || type === 'SETTLEMENT_COMPLETED') return `${base} badge-blue`
    if (type?.includes('DELETED')) return `${base} badge-red`
    return `${base} badge-amber`
  }

  return (
    <div className="w-full max-w-full px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading">Activity Logs</h1>
          <p className="text-text-muted mt-1">Monitor all actions performed across the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-mono">{total} total entries</span>
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-primary-lighter transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 min-w-[140px] rounded-xl overflow-hidden shadow-lg bg-white dark:bg-[#1e293b] border border-border">
                {['pdf', 'xlsx', 'csv'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
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
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">Search</label>
            <input className="input-field text-sm" placeholder="Name, trip, description..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">User</label>
            <select className="input-field text-sm" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
              <option value="">All Users</option>
              {allUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.full_name || u.username}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Action Type</label>
            <select className="input-field text-sm" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">All Actions</option>
              {actionTypes.map((at) => (
                <option key={at} value={at}>{ACTION_LABELS[at] || at}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Date From</label>
            <input type="date" className="input-field text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Date To</label>
              <input type="date" className="input-field text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary text-sm px-3 py-2">Filter</button>
            {(search || userFilter || actionFilter || dateFrom || dateTo) && (
              <button type="button" onClick={resetFilters} className="btn-secondary text-sm px-3 py-2">Clear</button>
            )}
          </div>
        </form>

        {loading ? (
          <div className="text-center py-10 text-text-muted">Loading activity logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-text-muted">No activity logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-semibold">Date & Time</th>
                    <th className="pb-3 pr-4 font-semibold">User</th>
                    <th className="pb-3 pr-4 font-semibold">Action</th>
                    <th className="pb-3 pr-4 font-semibold">Trip</th>
                    <th className="pb-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-b border-border-light hover:bg-primary-light/30 transition-colors">
                      <td className="py-3 pr-4 text-xs font-mono text-text-secondary whitespace-nowrap">
                        {formatTime(log.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-medium text-text-primary">{log.userName}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={getActionBadge(log.actionType)}>
                          {ACTION_LABELS[log.actionType] || log.actionType}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-text-secondary">
                        {log.tripName || '-'}
                      </td>
                      <td className="py-3 text-text-secondary text-xs max-w-xs truncate">
                        {log.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                <span className="text-xs text-text-muted">
                  Page {page} of {totalPages} ({total} entries)
                </span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50">Previous</button>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}