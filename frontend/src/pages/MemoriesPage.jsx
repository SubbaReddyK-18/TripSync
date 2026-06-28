import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMemories, createMemory, deleteMemory } from '../api/memories'
import { createComment, getComments, deleteComment } from '../api/comments'
import { useRequestLock } from '../hooks/useRequestLock'
import { uploadFile } from '../upload'
import { getTrip } from '../api/trips'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import toast from 'react-hot-toast'
import { youName, you } from '../utils/displayName'
import { motion, AnimatePresence } from 'framer-motion'

export default function MemoriesPage() {
  const { tripId } = useParams()
  const { user } = useAuthStore()
  const { systemConfig } = useUiStore()
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [trip, setTrip] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState('')
  const fileRef = useRef(null)
  const [submittingComment, submitCommentAction] = useRequestLock()
  const [commentText, setCommentText] = useState({})
  const [comments, setComments] = useState({})
  const [loadingComments, setLoadingComments] = useState({})
  const [fullscreenMem, setFullscreenMem] = useState(null)

  useEffect(() => { load() }, [tripId])

  const load = async () => {
    setLoading(true)
    try {
      const [memRes, tripRes] = await Promise.all([getMemories(tripId), getTrip(tripId)])
      setMemories(memRes.data.data.memories)
      setTrip(tripRes.data.data.trip)
    } catch {}
    setLoading(false)
  }

  const canUpload = trip && trip.status !== 'planning'

  const loadComments = async (memoryId) => {
    setLoadingComments((p) => ({ ...p, [memoryId]: true }))
    try {
      const { data } = await getComments(tripId, { target_type: 'memory', target_id: memoryId })
      setComments((p) => ({ ...p, [memoryId]: data.data.comments }))
    } catch {}
    setLoadingComments((p) => ({ ...p, [memoryId]: false }))
  }

  useEffect(() => { memories.forEach((m) => { if (!comments[m._id]) loadComments(m._id) }) }, [memories])

  const handleUpload = async (e) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const uploadRes = await uploadFile(file)
      const { cloudinary_url, cloudinary_public_id, file_type } = uploadRes.data.data
      const tagsArr = tags.split(',').map((t) => t.trim()).filter(Boolean)
      await createMemory(tripId, { cloudinary_url, cloudinary_public_id, file_type, caption, tags: tagsArr })
      toast.success('Memory uploaded'); setShowUpload(false); setCaption(''); setTags(''); fileRef.current.value = ''; load()
    } catch (err) { toast.error(err.response?.data?.error?.message || 'Upload failed') }
    setUploading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this memory?')) return
    try { await deleteMemory(tripId, id); toast.success('Memory deleted'); load() }
    catch (err) { toast.error(err.response?.data?.error?.message || 'Failed') }
  }

  const handleComment = async (memoryId) => {
    const text = commentText[memoryId]?.trim(); if (!text) return
    await submitCommentAction(async () => {
      await createComment(tripId, { target_type: 'memory', target_id: memoryId, text }); toast.success('Comment added'); setCommentText((p) => ({ ...p, [memoryId]: '' })); loadComments(memoryId)
    }).catch((err) => { toast.error(err.response?.data?.error?.message || 'Failed') })
  }

  const handleDeleteComment = async (memoryId, commentId) => {
    if (!confirm('Delete this comment?')) return
    try { await deleteComment(tripId, commentId); toast.success('Comment deleted'); loadComments(memoryId) }
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
          <p className="text-text-muted text-sm">Loading memories...</p>
        </div>
      </div>
    </div>
  )

  const getGridClass = (index) => {
    const r = index % 6
    if (r === 0) return 'sm:col-span-2 sm:row-span-2'
    if (r === 3) return 'sm:col-span-2'
    return ''
  }

  return (
    <div>
      {!systemConfig.enableMemories ? (
        <div className="px-4 py-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
          Memories are currently disabled by the administrator.
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
          <h1 className="text-h4 text-text-primary">Memories</h1>
          <p className="text-sm text-text-muted mt-0.5">{memories.length} memory{memories.length !== 1 ? 'ies' : ''} captured</p>
        </div>
        {canUpload && (
          <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Upload
          </button>
        )}
      </div>

      {!canUpload && trip && (
        <div className="card bg-accent-amber/5 border border-accent-amber/20 mb-6">
          <p className="text-sm text-accent-amber font-medium flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Memories can only be added during or after the trip. Wait until the trip starts to upload media.
          </p>
        </div>
      )}

      {memories.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center mx-auto mb-5 text-4xl">📸</div>
          <h2 className="text-h5 text-text-primary mb-2">No memories yet</h2>
          <p className="text-body-sm text-text-muted max-w-sm mx-auto leading-relaxed">Upload photos and videos to remember your trip</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4"
        >
          {memories.map((mem) => (
            <motion.div
              key={mem._id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="break-inside-avoid group relative rounded-2xl overflow-hidden border border-border bg-surface-elevated"
            >
              <div className="relative overflow-hidden">
                {mem.file_type === 'video' ? (
                  <video src={mem.cloudinary_url} className="w-full object-cover cursor-pointer" controls onClick={() => setFullscreenMem(mem)} />
                ) : (
                  <img src={mem.cloudinary_url} alt={mem.caption} className="w-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105" loading="lazy" onClick={() => setFullscreenMem(mem)} />
                )}
                <button onClick={() => handleDelete(mem._id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-red z-10">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <button onClick={() => setFullscreenMem(mem)}
                  className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black z-10"
                  title="View Fullscreen"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              <div className="p-4 space-y-2">
                {mem.caption && <p className="text-sm text-text-primary font-medium leading-snug">{mem.caption}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-text-muted">
                    <span className="font-medium text-text-secondary">{youName(user?._id, mem.uploader)}</span>
                    <span className="mx-1">·</span>
                    <span className="text-[10px]">Uploaded on:</span> {new Date(mem.upload_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                  </p>
                  {comments[mem._id]?.length > 0 && (
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      {comments[mem._id].length}
                    </span>
                  )}
                </div>
                {mem.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {mem.tags.map((tag, i) => (
                      <span key={i} className="text-xs bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded-full font-medium">#{tag}</span>
                    ))}
                  </div>
                )}

                {/* Comments */}
                <div className="border-t border-border pt-3 mt-2">
                  <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                    {loadingComments[mem._id] ? (
                      <p className="text-xs text-text-muted">Loading...</p>
                    ) : comments[mem._id]?.length === 0 ? (
                      <p className="text-xs text-text-muted italic">No comments yet</p>
                    ) : (
                      comments[mem._id]?.map((c) => (
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
                            <button onClick={() => handleDeleteComment(mem._id, c._id)} className="text-text-muted hover:text-accent-red shrink-0">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input className="input-field text-xs flex-1" placeholder="Write a comment..."
                      value={commentText[mem._id] || ''}
                      onChange={(e) => setCommentText((p) => ({ ...p, [mem._id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleComment(mem._id) }} />
                    <button onClick={() => handleComment(mem._id)} className="btn-primary text-xs px-3 py-1.5" disabled={submittingComment || !commentText[mem._id]?.trim()}>{submittingComment ? 'Posting...' : 'Post'}</button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
      {showUpload && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowUpload(false)}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-6">Upload Memory</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Photo or Video</label>
                <input type="file" ref={fileRef} accept="image/*,video/*" className="input-field" required disabled={uploading} />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Caption</label>
                <input className="input-field" placeholder="What's this memory about?" value={caption} onChange={(e) => setCaption(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Tags (comma separated)</label>
                <input className="input-field" placeholder="e.g. beach, sunset, friends" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary" disabled={uploading}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Fullscreen Viewer */}
      <AnimatePresence>
      {fullscreenMem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreenMem(null)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="relative max-w-[92vw] max-h-[92vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setFullscreenMem(null)}
              className="absolute -top-12 right-0 text-white/60 hover:text-white text-sm transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Close
            </button>
            {fullscreenMem.file_type === 'video' ? (
              <video src={fullscreenMem.cloudinary_url} className="max-w-full max-h-[85vh] rounded-2xl" controls autoPlay />
            ) : (
              <img src={fullscreenMem.cloudinary_url} alt={fullscreenMem.caption} className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
            )}
            <div className="text-center mt-4 text-white/80 max-w-lg">
              {fullscreenMem.caption && <p className="text-sm font-medium">{fullscreenMem.caption}</p>}
              {fullscreenMem.tags?.length > 0 && (
                <p className="text-xs text-white/50 mt-1">{fullscreenMem.tags.map(t => `#${t}`).join(' ')}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
    )}
    </div>
  )
}
