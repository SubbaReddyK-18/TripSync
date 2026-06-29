import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useTripStore from '../stores/tripStore'
import useUiStore from '../stores/uiStore'
import { createTrip } from '../api/trips'
import { useRequestLock } from '../hooks/useRequestLock'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const statusConfig = {
  ongoing: { label: 'Ongoing', icon: '🟢', class: 'bg-accent-green/15 text-accent-green border-accent-green/25' },
  upcoming: { label: 'Upcoming', icon: '🔵', class: 'bg-accent-blue/15 text-accent-blue border-accent-blue/25' },
  completed: { label: 'Completed', icon: '⚫', class: 'bg-gray-500/15 text-gray-400 border-gray-500/25' },
}

const destinationGradients = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-orange-500 to-rose-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-green-500 to-emerald-600',
]

const getDestinationGradient = (destination) => {
  let hash = 0
  const str = destination || 'travel'
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return destinationGradients[Math.abs(hash) % destinationGradients.length]
}

const categorizeTrip = (trip) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = trip.start_date ? new Date(trip.start_date) : null
  const end = trip.end_date ? new Date(trip.end_date) : null

  if (start && end && start <= today && today <= end) return 'ongoing'
  if (start && start > today) return 'upcoming'
  return 'completed'
}

export default function TripsPage() {
  const { trips, loading, fetchTrips, error } = useTripStore()
  const { systemConfig } = useUiStore()
  const navigate = useNavigate()

  useEffect(() => { fetchTrips() }, [fetchTrips])
  useEffect(() => { if (error) toast.error(error) }, [error])

  const [sortOrder, setSortOrder] = useState('latest')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, createTripAction] = useRequestLock()
  const [form, setForm] = useState({ title: '', destination: '', start_date: '', end_date: '', description: '' })

  const handleCreate = async (e) => {
    e.preventDefault()
    await createTripAction(async () => {
      const { data } = await createTrip(form)
      toast.success('Trip created!')
      setShowCreate(false)
      setForm({ title: '', destination: '', start_date: '', end_date: '', description: '' })
      fetchTrips()
      navigate(`/trips/${data.data.trip._id}`)
    }).catch((err) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to create trip')
    })
  }

  const displayTrips = useMemo(() => {
    const ongoing = []
    const upcoming = []
    const completed = []

    trips.forEach((trip) => {
      const category = categorizeTrip(trip)
      if (category === 'ongoing') ongoing.push(trip)
      else if (category === 'upcoming') upcoming.push(trip)
      else completed.push(trip)
    })

    const sortFn = sortOrder === 'latest'
      ? (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      : (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)

    ongoing.sort(sortFn)
    upcoming.sort(sortFn)
    completed.sort(sortFn)

    return [
      ...ongoing.map((t) => ({ ...t, _category: 'ongoing' })),
      ...upcoming.map((t) => ({ ...t, _category: 'upcoming' })),
      ...completed.map((t) => ({ ...t, _category: 'completed' })),
    ]
  }, [trips, sortOrder])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 15 } },
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      {!systemConfig.enableTrips && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/15 text-red-500 text-sm font-medium text-center">
          Trip creation is currently disabled by the administrator. Existing trips remain accessible.
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-h3 text-text-primary">My Trips</h1>
          <p className="text-body-sm text-text-muted">
            {loading ? 'Loading...' : `Showing ${displayTrips.length} of ${trips.length} trip${trips.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-primary-lighter/50 border border-border/40">
          {['latest', 'oldest'].map((opt) => (
            <button
              key={opt}
              onClick={() => setSortOrder(opt)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 capitalize ${
                sortOrder === opt
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card !p-0 overflow-hidden animate-pulse">
              <div className="h-44 bg-primary-lighter" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-primary-lighter rounded-md w-3/4" />
                <div className="h-4 bg-primary-lighter rounded-md w-1/2" />
                <div className="h-4 bg-primary-lighter rounded-md w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-20 border-dashed border-2 border-border/60"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-green/20 to-accent-cyan/20 flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✈️</span>
          </div>
          <h2 className="text-h5 text-text-primary mb-2">No trips yet</h2>
          <p className="text-body-sm text-text-muted max-w-sm mx-auto mb-6 leading-relaxed">
            Create your first journey and start exploring the world with friends.
          </p>
          {systemConfig.enableTrips && (
            <button onClick={() => setShowCreate(true)} className="btn-primary shadow-lg shadow-accent-green/20">
              Create your first trip
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {displayTrips.map((trip) => {
            const status = statusConfig[trip._category]
            const gradient = getDestinationGradient(trip.destination)
            if (!status) return null
            return (
              <motion.div
                key={trip._id}
                variants={cardVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Link
                  to={`/trips/${trip._id}`}
                  className="card !p-0 overflow-hidden group block h-full"
                >
                  <div className={`relative h-44 bg-gradient-to-br ${gradient} overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute top-4 right-4">
                      <span className={`badge text-[11px] font-semibold border ${status.class} bg-white/10 backdrop-blur-md`}>
                        {status.icon} {status.label}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-lg font-heading font-bold text-white drop-shadow-sm truncate">
                        {trip.title}
                      </h3>
                      {trip.destination && (
                        <p className="text-sm text-white/80 font-medium flex items-center gap-1.5 mt-0.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {trip.destination}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {trip.start_date
                          ? new Date(trip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })
                          : ''}
                        {trip.end_date
                          ? ` - ${new Date(trip.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })}`
                          : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-heading font-semibold mb-6">Create New Trip</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input className="input-field" placeholder="Trip Title" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <input className="input-field" placeholder="Destination" value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Start Date</label>
                  <input type="date" className="input-field" value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">End Date</label>
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
    </div>
  )
}
