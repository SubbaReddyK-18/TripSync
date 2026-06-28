import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getLocations, createLocation, deleteLocation } from '../api/locations'
import { useRequestLock } from '../hooks/useRequestLock'
import toast from 'react-hot-toast'
import { youName } from '../utils/displayName'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import { motion, AnimatePresence } from 'framer-motion'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const categoryColors = {
  attraction: '#f97316', restaurant: '#ef4444', hotel: '#8b5cf6', transport: '#3b82f6',
  nature: '#22c55e', museum: '#ec4899', shopping: '#f59e0b', nightlife: '#6366f1', other: '#6b7280',
}

const categoryLabels = {
  attraction: 'Attraction', restaurant: 'Restaurant', hotel: 'Hotel', transport: 'Transport',
  nature: 'Nature', museum: 'Museum', shopping: 'Shopping', nightlife: 'Nightlife', other: 'Other',
}

const placeGradients = {
  attraction: 'from-orange-500 to-rose-600',
  restaurant: 'from-red-500 to-pink-600',
  hotel: 'from-violet-500 to-purple-600',
  transport: 'from-blue-500 to-indigo-600',
  nature: 'from-green-500 to-emerald-600',
  museum: 'from-pink-500 to-rose-600',
  shopping: 'from-amber-500 to-orange-600',
  nightlife: 'from-indigo-500 to-violet-600',
  other: 'from-gray-500 to-slate-600',
}

export default function PlacesPage() {
  const { tripId } = useParams()
  const { user } = useAuthStore()
  const { systemConfig } = useUiStore()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, submitPlace] = useRequestLock()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '', latitude: '', longitude: '', visit_date: new Date().toISOString().split('T')[0],
    category: 'attraction', description: '',
  })
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])

  useEffect(() => { load() }, [tripId])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getLocations(tripId)
      setLocations(data.data.locations)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const map = L.map(mapRef.current).setView([20, 0], 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map)
    map.on('click', (e) => {
      setForm((prev) => ({ ...prev, latitude: e.latlng.lat.toFixed(6), longitude: e.latlng.lng.toFixed(6) }))
      if (!showAdd) setShowAdd(true)
    })
    mapInstance.current = map
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [loading])

  useEffect(() => {
    if (!mapInstance.current) return
    markersRef.current.forEach((m) => mapInstance.current.removeLayer(m))
    markersRef.current = []
    locations.forEach((loc) => {
      const color = categoryColors[loc.category] || categoryColors.other
      const icon = L.divIcon({
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7], className: '',
      })
      const marker = L.marker([loc.latitude, loc.longitude], { icon }).addTo(mapInstance.current)
        .bindPopup(`<strong>${loc.name}</strong>${loc.category ? `<br><span style="color:${color};font-size:0.8em">${categoryLabels[loc.category] || loc.category}</span>` : ''}${loc.description ? `<br><small>${loc.description}</small>` : ''}<br><small style="color:#999">${loc.visit_date?.split('T')[0] || loc.visit_date}</small>`)
      markersRef.current.push(marker)
    })
    if (locations.length > 0) {
      const group = L.featureGroup(markersRef.current)
      mapInstance.current.fitBounds(group.getBounds().pad(0.1))
    }
  }, [locations])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await submitPlace(async () => {
      const payload = { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) }
      await createLocation(tripId, payload)
      toast.success('Location added'); setShowAdd(false)
      setForm({ name: '', latitude: '', longitude: '', visit_date: new Date().toISOString().split('T')[0], category: 'attraction', description: '' })
      load()
    }).catch((err) => { toast.error(err.response?.data?.error?.message || 'Failed') })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this location?')) return
    try { await deleteLocation(tripId, id); toast.success('Location deleted'); load() }
    catch (err) { toast.error(err.response?.data?.error?.message || 'Failed') }
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
          <p className="text-text-muted text-sm">Loading places...</p>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {!systemConfig.enablePlaces ? (
        <div className="px-4 py-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
          Places are currently disabled by the administrator.
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
          <h1 className="text-h4 text-text-primary">Visited Places</h1>
          <p className="text-sm text-text-muted mt-0.5">{locations.length} destination{locations.length !== 1 ? 's' : ''} explored</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Place
        </button>
      </div>

      {/* Map */}
      <div ref={mapRef} className="w-full h-[350px] rounded-2xl border border-border mb-8 z-0 overflow-hidden" />

      {locations.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-amber/20 to-accent-orange/20 flex items-center justify-center mx-auto mb-5 text-4xl">📍</div>
          <h2 className="text-h5 text-text-primary mb-2">No places recorded yet</h2>
          <p className="text-body-sm text-text-muted max-w-sm mx-auto leading-relaxed">Click on the map or use the Add button to track places you've visited</p>
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {locations.map((loc) => {
            const color = categoryColors[loc.category] || categoryColors.other
            const gradient = placeGradients[loc.category] || placeGradients.other
            return (
              <motion.div
                key={loc._id}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                whileHover={{ y: -4 }}
                className="card !p-0 overflow-hidden group"
              >
                <div className={`relative h-32 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <div className="absolute inset-0 bg-black/10" />
                  <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="absolute top-2 right-2 badge text-[10px] font-semibold bg-white/20 backdrop-blur-md text-white border border-white/20">
                    {categoryLabels[loc.category] || loc.category}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">{loc.name}</h3>
                      <p className="text-xs text-text-muted mt-1">
                        Added by {youName(user?._id, loc.added_by_user)}
                        {loc.created_at && (
                          <>
                            <span className="mx-1">·</span>
                            <span>{new Date(loc.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(loc._id)}
                      className="text-text-muted hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  {loc.description && <p className="text-xs text-text-secondary mt-2 line-clamp-2">{loc.description}</p>}
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-text-muted">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {loc.visit_date?.split('T')[0] || loc.visit_date}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      <AnimatePresence>
      {showAdd && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAdd(false)}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-6">Add Visited Place</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              <input className="input-field" placeholder="Place name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Latitude</label>
                  <input type="number" step="any" className="input-field" placeholder="e.g. 48.8566" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Longitude</label>
                  <input type="number" step="any" className="input-field" placeholder="e.g. 2.3522" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Visit Date</label>
                  <input type="date" className="input-field" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Category</label>
                  <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {Object.entries(categoryLabels).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>
              </div>
              <textarea className="input-field" placeholder="Description (optional)" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Adding Place...' : 'Add Place'}</button>
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
