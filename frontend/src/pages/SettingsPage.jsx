import { useState, useRef } from 'react'
import { updateMe, changePassword, removeProfilePhoto } from '../api/users'
import { uploadFile } from '../upload'
import useAuthStore from '../stores/authStore'
import toast from 'react-hot-toast'
import Avatar from '../components/common/Avatar'
import ProfilePhotoCropper from '../components/common/ProfilePhotoCropper'
import {
  validateFileType,
  validateFileSize,
  loadImage,
  validateImageDimensions,
  getCroppedBlob,
  ERROR_MESSAGES,
} from '../utils/imageUtils'

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    username: user?.username || '',
    bio: user?.bio || '',
  })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' })
  const [pwShow, setPwShow] = useState({ current: false, new: false })
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [removingPhoto, setRemovingPhoto] = useState(false)
  const [cropFile, setCropFile] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)
  const [validationError, setValidationError] = useState('')
  const fileInputRef = useRef(null)

  const handleProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await updateMe(profile)
      setUser(data.data.user)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update')
    }
    setSaving(false)
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    setChangingPw(true)
    try {
      await changePassword(pwForm)
      toast.success('Password changed')
      setPwForm({ current_password: '', new_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to change password')
    }
    setChangingPw(false)
  }

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setValidationError('')

    if (!validateFileType(file)) {
      setValidationError(ERROR_MESSAGES.type)
      e.target.value = ''
      return
    }

    if (!validateFileSize(file)) {
      setValidationError(ERROR_MESSAGES.size)
      e.target.value = ''
      return
    }

    try {
      const img = await loadImage(file)
      if (!validateImageDimensions(img)) {
        setValidationError(ERROR_MESSAGES.dimensions)
        e.target.value = ''
        return
      }
      setCropFile(file)
      setCropSrc(URL.createObjectURL(file))
    } catch {
      setValidationError('Failed to load image. Please try another file.')
      e.target.value = ''
    }
  }

  const handleCropComplete = async (croppedAreaPixels) => {
    if (!cropFile) return
    setUploadingPhoto(true)
    try {
      const img = await loadImage(cropFile)
      const croppedBlob = await getCroppedBlob(img, croppedAreaPixels)
      const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' })
      const res = await uploadFile(croppedFile)
      const { data: updated } = await updateMe({
        profile_photo_url: res.data.data.cloudinary_url,
        profile_photo_public_id: res.data.data.cloudinary_public_id,
      })
      setUser(updated.data.user)
      toast.success('Profile photo updated')
      setCropSrc(null)
      setCropFile(null)
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleCropCancel = () => {
    setCropSrc(null)
    setCropFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemovePhoto = async () => {
    if (!confirm('Remove your profile photo?')) return
    setRemovingPhoto(true)
    try {
      const { data } = await removeProfilePhoto()
      setUser(data.data.user)
      toast.success('Profile photo removed')
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to remove')
    } finally {
      setRemovingPhoto(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6 lg:mb-8">
        <h1 className="text-2xl font-heading">Settings</h1>
        {user?.role === 'admin' && (
          <span className="badge badge-amber text-[10px]">ADMIN</span>
        )}
      </div>

      <div className="card !p-4 lg:!p-6 mb-4 lg:mb-6">
        <h2 className="text-lg font-semibold mb-4 lg:mb-6">Profile</h2>

        <div className="flex items-center gap-4 lg:gap-5 mb-4 lg:mb-6 pb-4 lg:pb-6 border-b border-border/40">
          <div className="relative group shrink-0">
            <Avatar user={user} size="lg" className="!w-14 !h-14" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="btn-primary text-xs !py-1.5 !px-3"
              >
                {uploadingPhoto ? 'Uploading...' : user?.profile_photo_url ? 'Change Photo' : 'Upload Photo'}
              </button>
              {user?.profile_photo_url && (
                <button
                  onClick={handleRemovePhoto}
                  disabled={removingPhoto}
                  className="btn-secondary text-xs !py-1.5 !px-3"
                >
                  {removingPhoto ? 'Removing...' : 'Remove'}
                </button>
              )}
            </div>
            {validationError && (
              <p className="text-xs text-accent-red font-medium mt-2">{validationError}</p>
            )}
            <p className="text-xs text-text-muted mt-2">Recommended: Square image (minimum 256 × 256 px). JPG, PNG or WebP. Max 5 MB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        <form onSubmit={handleProfile} className="space-y-3 lg:space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-0.5 lg:mb-1">Full Name</label>
            <input className="input-field" value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-0.5 lg:mb-1">Username</label>
            <input className="input-field" value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })} required />
          </div>
          {user?.role !== 'admin' && (
            <div>
              <label className="block text-sm text-text-secondary mb-0.5 lg:mb-1">Bio</label>
              <textarea className="input-field" rows={2} value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell us about yourself" />
            </div>
          )}
          <div>
            <label className="block text-sm text-text-secondary mb-0.5 lg:mb-1">Email</label>
            <input className="input-field" value={user?.email || ''} disabled />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card !p-4 lg:!p-6 mb-4 lg:mb-6">
        <h2 className="text-lg font-semibold mb-4 lg:mb-6">Change Password</h2>
        <form onSubmit={handlePassword} className="space-y-3 lg:space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-0.5 lg:mb-1">Current Password</label>
            <div className="relative">
              <input type={pwShow.current ? 'text' : 'password'} className="input-field w-full pr-10" value={pwForm.current_password}
                onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} required />
              <button type="button" onClick={() => setPwShow((p) => ({ ...p, current: !p.current }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary">
                {pwShow.current ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94m1.936-1.936A9.12 9.12 0 0112 3c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-0.5 lg:mb-1">New Password</label>
            <div className="relative">
              <input type={pwShow.new ? 'text' : 'password'} className="input-field w-full pr-10" value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} required minLength={8} />
              <button type="button" onClick={() => setPwShow((p) => ({ ...p, new: !p.new }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary">
                {pwShow.new ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94m1.936-1.936A9.12 9.12 0 0112 3c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
            {pwForm.new_password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {['bg-accent-red', ...(pwForm.new_password.length >= 4 ? ['bg-accent-amber'] : ['bg-primary-lighter']), ...(pwForm.new_password.length >= 6 ? ['bg-accent-amber'] : ['bg-primary-lighter']), ...(pwForm.new_password.length >= 8 && /[A-Z]/.test(pwForm.new_password) && /[0-9]/.test(pwForm.new_password) ? ['bg-accent-green'] : ['bg-primary-lighter'])].slice(0, 4).map((c, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${c}`} />
                  ))}
                </div>
                <p className="text-[11px] text-text-muted">
                  {pwForm.new_password.length < 6 ? 'Weak' : pwForm.new_password.length < 8 ? 'Fair' : /[A-Z]/.test(pwForm.new_password) && /[0-9]/.test(pwForm.new_password) ? 'Strong' : 'Fair'}
                </p>
              </div>
            )}
          </div>
          <button type="submit" disabled={changingPw} className="btn-secondary">
            {changingPw ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
      {cropSrc && (
        <ProfilePhotoCropper
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}
