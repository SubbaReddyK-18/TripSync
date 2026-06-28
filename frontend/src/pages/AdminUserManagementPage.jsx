import { useState, useEffect } from 'react'
import { getAdminUsers, getUserStats, updateUserRole, updateUserStatus } from '../api/admin'
import { useRequestLock } from '../hooks/useRequestLock'
import toast from 'react-hot-toast'

const fmtTime = (iso) => {
  if (!iso) return 'Never'
  const now = new Date()
  const d = new Date(iso)
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
}

const fmtDate = (iso) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  } catch { return '-' }
}

export default function AdminUserManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userStats, setUserStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirming, confirmActionLock] = useRequestLock()

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await getAdminUsers()
      setUsers(data.data.users || [])
    } catch {
      toast.error('Failed to load users')
    }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchesSearch = !search ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    const matchesRole = !roleFilter || u.role === roleFilter
    return matchesSearch && matchesRole
  }).sort((a, b) => {
    if (sortBy === 'created_at') {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    }
    return new Date(b.lastActive || 0) - new Date(a.lastActive || 0)
  })

  const totalUsers = users.length
  const totalAdmins = users.filter((u) => u.role === 'admin').length
  const activeUsers = users.filter((u) => u.is_active !== false).length
  const joinedThisMonth = users.filter((u) => {
    if (!u.created_at) return false
    const d = new Date(u.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const openUserDetails = async (user) => {
    setSelectedUser(user)
    setStatsLoading(true)
    setUserStats(null)
    try {
      const { data } = await getUserStats(user._id)
      setUserStats(data.data)
    } catch {
      setUserStats(null)
    }
    setStatsLoading(false)
  }

  const handleRoleChange = async (userId, newRole) => {
    await confirmActionLock(async () => {
      await updateUserRole(userId, newRole)
      toast.success(`User ${newRole === 'admin' ? 'promoted to admin' : 'demoted to user'}`)
      loadUsers()
      setConfirmAction(null)
    }).catch((err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update role')
      setConfirmAction(null)
    })
  }

  const handleStatusChange = async (userId, isActive) => {
    await confirmActionLock(async () => {
      await updateUserStatus(userId, isActive)
      toast.success(`User ${isActive ? 'activated' : 'deactivated'}`)
      loadUsers()
      setConfirmAction(null)
    }).catch((err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update status')
      setConfirmAction(null)
    })
  }

  return (
    <div className="w-full max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-heading">User Management</h1>
        <p className="text-sm text-text-muted mt-1">Manage and monitor all registered users across the platform.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card !p-4 bg-surface-elevated border border-border/60">
          <p className="text-2xl font-bold font-mono text-accent-blue">{totalUsers}</p>
          <p className="text-xs text-text-muted font-medium mt-1">Total Users</p>
        </div>
        <div className="card !p-4 bg-surface-elevated border border-border/60">
          <p className="text-2xl font-bold font-mono text-accent-amber">{totalAdmins}</p>
          <p className="text-xs text-text-muted font-medium mt-1">Admins</p>
        </div>
        <div className="card !p-4 bg-surface-elevated border border-border/60">
          <p className="text-2xl font-bold font-mono text-accent-green">{activeUsers}</p>
          <p className="text-xs text-text-muted font-medium mt-1">Active Users</p>
        </div>
        <div className="card !p-4 bg-surface-elevated border border-border/60">
          <p className="text-2xl font-bold font-mono text-accent-amber">{joinedThisMonth}</p>
          <p className="text-xs text-text-muted font-medium mt-1">Joined This Month</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input-field pl-9"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto min-w-[130px]"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          className="input-field w-auto min-w-[150px]"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="created_at">Sort by Join Date</option>
          <option value="lastActive">Sort by Last Active</option>
        </select>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Username</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Trips</th>
                <th className="py-3 px-4 font-semibold">Last Active</th>
                <th className="py-3 px-4 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-muted">Loading users...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-muted">
                    {search || roleFilter ? 'No users match your filters.' : 'No users found. Users will appear here once registrations begin.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isRecent = u.lastActive && (Date.now() - new Date(u.lastActive)) < 3600000
                  const isOnline = u.is_active !== false && isRecent
                  return (
                    <tr
                      key={u._id}
                      className="border-b border-border-light hover:bg-accent-green/5 transition-colors cursor-pointer"
                      onClick={() => openUserDetails(u)}
                    >
                      <td className="py-3 px-4">
                        {u.profile_photo_url ? (
                          <img src={u.profile_photo_url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-border" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-indigo to-accent-purple flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm">
                            {u.full_name?.charAt(0) || u.username?.charAt(0) || '?'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-text-primary">{u.full_name || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-xs">{u.email}</td>
                      <td className="py-3 px-4 text-text-secondary">@{u.username}</td>
                      <td className="py-3 px-4">
                        <span className={`badge text-[10px] ${u.role === 'admin' ? 'badge-amber' : 'badge-blue'}`}>
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                          u.is_active === false
                            ? 'text-text-muted'
                            : isRecent
                              ? 'text-accent-green'
                              : 'text-accent-blue'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            u.is_active === false
                              ? 'bg-text-muted'
                              : isRecent
                                ? 'bg-accent-green'
                                : 'bg-accent-blue'
                          }`} />
                          {u.is_active === false ? 'Offline' : isRecent ? 'Online' : 'Recent'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-secondary font-mono text-xs">{u.trip_count ?? u.trips_created ?? 0}</td>
                      <td className="py-3 px-4 text-text-secondary text-xs">{fmtTime(u.lastActive || u.created_at)}</td>
                      <td className="py-3 px-4 text-text-secondary text-xs font-mono">{fmtDate(u.created_at)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="modal-overlay" onClick={() => { setSelectedUser(null); setUserStats(null) }}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {selectedUser.profile_photo_url ? (
                  <img src={selectedUser.profile_photo_url} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-indigo to-accent-purple flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-sm">
                    {selectedUser.full_name?.charAt(0) || selectedUser.username?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-heading text-text-primary">{selectedUser.full_name || 'N/A'}</h2>
                  <p className="text-sm text-text-muted">@{selectedUser.username}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedUser(null); setUserStats(null) }} className="text-text-muted hover:text-text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-primary-light/50 rounded-lg p-3 border border-border/50">
                <p className="text-xs text-text-muted">Email</p>
                <p className="text-sm font-medium text-text-primary mt-0.5 truncate">{selectedUser.email}</p>
              </div>
              <div className="bg-primary-light/50 rounded-lg p-3 border border-border/50">
                <p className="text-xs text-text-muted">Role</p>
                <p className="text-sm font-medium mt-0.5">
                  <span className={`badge ${selectedUser.role === 'admin' ? 'badge-amber' : 'badge-blue'}`}>
                    {selectedUser.role}
                  </span>
                </p>
              </div>
              <div className="bg-primary-light/50 rounded-lg p-3 border border-border/50">
                <p className="text-xs text-text-muted">Joined Date</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">{fmtDate(selectedUser.created_at)}</p>
              </div>
              <div className="bg-primary-light/50 rounded-lg p-3 border border-border/50">
                <p className="text-xs text-text-muted">Last Active</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">{fmtTime(selectedUser.lastActive)}</p>
              </div>
            </div>

            {userStats && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-text-primary mb-3">User Activity</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-accent-green/5 rounded-lg p-3 border border-accent-green/10 text-center">
                    <p className="text-lg font-bold font-mono text-accent-green">{userStats.trips_created}</p>
                    <p className="text-[10px] text-text-muted font-medium mt-0.5">Trips Created</p>
                  </div>
                  <div className="bg-accent-blue/5 rounded-lg p-3 border border-accent-blue/10 text-center">
                    <p className="text-lg font-bold font-mono text-accent-blue">{userStats.expenses_added}</p>
                    <p className="text-[10px] text-text-muted font-medium mt-0.5">Expenses Added</p>
                  </div>
                  <div className="bg-accent-amber/5 rounded-lg p-3 border border-accent-amber/10 text-center">
                    <p className="text-lg font-bold font-mono text-accent-amber">₹{(userStats.total_expense_amount / 100).toLocaleString()}</p>
                    <p className="text-[10px] text-text-muted font-medium mt-0.5">Total Expense Amt</p>
                  </div>
                  <div className="bg-accent-red/5 rounded-lg p-3 border border-accent-red/10 text-center">
                    <p className="text-lg font-bold font-mono text-accent-red">{userStats.memories_uploaded}</p>
                    <p className="text-[10px] text-text-muted font-medium mt-0.5">Memories Uploaded</p>
                  </div>
                  <div className="bg-accent-purple/5 rounded-lg p-3 border border-accent-purple/10 text-center">
                    <p className="text-lg font-bold font-mono text-accent-purple">{userStats.places_added}</p>
                    <p className="text-[10px] text-text-muted font-medium mt-0.5">Places Added</p>
                  </div>
                  <div className="bg-accent-green/5 rounded-lg p-3 border border-accent-green/10 text-center">
                    <p className="text-lg font-bold font-mono text-accent-green">{userStats.settlements}</p>
                    <p className="text-[10px] text-text-muted font-medium mt-0.5">Settlements</p>
                  </div>
                </div>
              </div>
            )}

            {statsLoading && (
              <div className="text-center py-4 text-text-muted text-sm">Loading activity stats...</div>
            )}

            <div className="border-t border-border pt-4 flex flex-wrap gap-3">
              {selectedUser.role !== 'admin' ? (
                <button
                  onClick={() => setConfirmAction({ type: 'promote', user: selectedUser })}
                  className="btn-primary text-sm"
                >
                  Promote to Admin
                </button>
              ) : (
                <button
                  onClick={() => setConfirmAction({ type: 'demote', user: selectedUser })}
                  className="btn-secondary text-sm"
                >
                  Demote to User
                </button>
              )}
              {selectedUser.is_active !== false ? (
                <button
                  onClick={() => setConfirmAction({ type: 'deactivate', user: selectedUser })}
                  className="btn-secondary text-sm text-accent-red border-accent-red/20 hover:bg-accent-red/5"
                >
                  Deactivate User
                </button>
              ) : (
                <button
                  onClick={() => setConfirmAction({ type: 'activate', user: selectedUser })}
                  className="btn-secondary text-sm text-accent-green border-accent-green/20 hover:bg-accent-green/5"
                >
                  Reactivate User
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Confirm Action</h3>
            <p className="text-sm text-text-secondary mb-6">
              {confirmAction.type === 'promote' && `Are you sure you want to promote ${confirmAction.user.full_name || confirmAction.user.username} to Administrator?`}
              {confirmAction.type === 'demote' && `Are you sure you want to demote ${confirmAction.user.full_name || confirmAction.user.username} to User?`}
              {confirmAction.type === 'deactivate' && `Are you sure you want to deactivate ${confirmAction.user.full_name || confirmAction.user.username}? They will not be able to log in.`}
              {confirmAction.type === 'activate' && `Are you sure you want to reactivate ${confirmAction.user.full_name || confirmAction.user.username}?`}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)} className="btn-secondary">Cancel</button>
              <button
                disabled={confirming}
                onClick={() => {
                  if (confirmAction.type === 'promote') handleRoleChange(confirmAction.user._id, 'admin')
                  else if (confirmAction.type === 'demote') handleRoleChange(confirmAction.user._id, 'user')
                  else if (confirmAction.type === 'deactivate') handleStatusChange(confirmAction.user._id, false)
                  else if (confirmAction.type === 'activate') handleStatusChange(confirmAction.user._id, true)
                }}
                className="btn-primary"
              >
                {confirming ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}