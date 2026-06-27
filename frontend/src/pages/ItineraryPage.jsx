import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getItinerary, createItem, deleteItem } from '../api/itinerary'
import { createComment, getComments, deleteComment } from '../api/comments'
import useAuthStore from '../stores/authStore'
import toast from 'react-hot-toast'
import { youName } from '../utils/displayName'

export default function ItineraryPage() {
  const { tripId } = useParams()
  const { user } = useAuthStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', date: new Date().toISOString().split('T')[0],
    start_time: '', end_time: '', location: '', type: 'activity', notes: '', booking_reference: '',
  })
  const [commentText, setCommentText] = useState({})
  const [comments, setComments] = useState({})
  const [loadingComments, setLoadingComments] = useState({})

  useEffect(() => { load() }, [tripId])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getItinerary(tripId)
      setItems(data.data.items)
    } catch {}
    setLoading(false)
  }

  const loadComments = async (itemId) => {
    setLoadingComments((p) => ({ ...p, [itemId]: true }))
    try {
      const { data } = await getComments(tripId, { target_type: 'itinerary_item', target_id: itemId })
      setComments((p) => ({ ...p, [itemId]: data.data.comments }))
    } catch {}
    setLoadingComments((p) => ({ ...p, [itemId]: false }))
  }

  useEffect(() => {
    items.forEach((item) => { if (!comments[item._id]) loadComments(item._id) })
  }, [items])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createItem(tripId, form)
      toast.success('Item added')
      setShowAdd(false)
      setForm({ title: '', description: '', date: new Date().toISOString().split('T')[0],
        start_time: '', end_time: '', location: '', type: 'activity', notes: '', booking_reference: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      await deleteItem(tripId, id)
      toast.success('Item deleted')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed')
    }
  }

  const handleComment = async (itemId) => {
    const text = commentText[itemId]?.trim()
    if (!text) return
    try {
      await createComment(tripId, { target_type: 'itinerary_item', target_id: itemId, text })
      toast.success('Comment added')
      setCommentText((p) => ({ ...p, [itemId]: '' }))
      loadComments(itemId)
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed')
    }
  }

  const handleDeleteComment = async (itemId, commentId) => {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteComment(tripId, commentId)
      toast.success('Comment deleted')
      loadComments(itemId)
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed')
    }
  }

  const groupedByDate = items.reduce((acc, item) => {
    const date = item.date?.split('T')[0] || 'Unknown'
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {})

  const sortedDates = Object.keys(groupedByDate).sort()

  if (loading) return (
    <div>
      <div className="mb-4">
        <Link to={`/trips/${tripId}`} className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Trip Overview
        </Link>
      </div>
      <div className="text-center py-20 text-text-muted">Loading itinerary...</div>
    </div>
  )

  return (
    <div>
      <div className="mb-4">
        <Link to={`/trips/${tripId}`} className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Trip Overview
        </Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading">Itinerary</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Item</button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center mx-auto mb-4 text-3xl">
            📅
          </div>
          <p className="text-text-muted text-lg mb-2">No itinerary items yet</p>
          <p className="text-text-muted text-sm">Plan your trip day by day</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="text-lg font-heading text-accent-blue mb-4 sticky top-16 bg-primary py-2 z-10">{date}</h3>
              <div className="space-y-3">
                {groupedByDate[date].map((item) => (
                  <div key={item._id} className="card group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          item.type === 'transport' ? 'bg-accent-blue' :
                          item.type === 'accommodation' ? 'bg-accent-green' :
                          item.type === 'meal' ? 'bg-accent-amber' :
                          item.type === 'activity' ? 'bg-accent-red' : 'bg-text-muted'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.title}</p>
                            <span className="badge text-[10px] bg-primary-lighter text-text-secondary capitalize">{item.type}</span>
                          </div>
                          {item.description && <p className="text-sm text-text-secondary mt-1">{item.description}</p>}
                          <div className="flex gap-4 mt-2 text-xs text-text-muted flex-wrap">
                            {item.start_time && <span>{item.start_time}{item.end_time ? ` - ${item.end_time}` : ''}</span>}
                            {item.location && <span>📍 {item.location}</span>}
                            {item.booking_reference && <span>🔖 {item.booking_reference}</span>}
                          </div>
                          {item.notes && <p className="text-xs text-text-muted mt-1 italic">{item.notes}</p>}

                          {/* Comments Section */}
                          <div className="border-t border-border pt-3 mt-3">
                            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                              {loadingComments[item._id] ? (
                                <p className="text-xs text-text-muted">Loading comments...</p>
                              ) : comments[item._id]?.length === 0 ? (
                                <p className="text-xs text-text-muted italic">No comments yet</p>
                              ) : (
                                comments[item._id]?.map((c) => (
                                  <div key={c._id} className="flex items-start gap-2 text-xs">
                                  {c.author?.profile_photo_url ? (
                                    <img src={c.author.profile_photo_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-accent-blue/20 flex items-center justify-center text-[9px] font-bold text-accent-blue shrink-0">
                                      {c.author?.full_name?.charAt(0) || '?'}
                                    </div>
                                  )}
                                    <div className="flex-1 min-w-0">
                                      <span className="font-semibold text-text-primary">{youName(user?._id, c.author)}</span>
                                      <span className="text-text-secondary"> {c.is_deleted ? '[deleted]' : c.text}</span>
                                      <span className="block text-[10px] text-text-muted mt-0.5">{new Date(c.created_at).toLocaleString(undefined, { timeZone: 'Asia/Kolkata' })}</span>
                                    </div>
                                    {c.author_id === user?._id && !c.is_deleted && (
                                      <button onClick={() => handleDeleteComment(item._id, c._id)}
                                        className="text-text-muted hover:text-accent-red shrink-0">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                            <div className="flex gap-2">
                              <input
                                className="input-field text-xs flex-1"
                                placeholder="Write a comment..."
                                value={commentText[item._id] || ''}
                                onChange={(e) => setCommentText((p) => ({ ...p, [item._id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleComment(item._id) }}
                              />
                              <button onClick={() => handleComment(item._id)}
                                className="btn-primary text-xs px-3 py-1.5"
                                disabled={!commentText[item._id]?.trim()}>
                                Post
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(item._id)}
                        className="text-text-muted hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-6">Add Itinerary Item</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input className="input-field" placeholder="Title" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Date</label>
                  <input type="date" className="input-field" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Type</label>
                  <select className="input-field" value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="activity">Activity</option>
                    <option value="transport">Transport</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="meal">Meal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Start Time</label>
                  <input type="time" className="input-field" value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">End Time</label>
                  <input type="time" className="input-field" value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
              <input className="input-field" placeholder="Location" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <textarea className="input-field" placeholder="Description" rows={2}
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input className="input-field" placeholder="Booking Reference" value={form.booking_reference}
                onChange={(e) => setForm({ ...form, booking_reference: e.target.value })} />
              <textarea className="input-field" placeholder="Notes" rows={2}
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
