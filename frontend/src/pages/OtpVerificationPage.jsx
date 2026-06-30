import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyOtp, resendOtp } from '../api/auth'
import { updateMe } from '../api/users'
import { uploadFile } from '../upload'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import AnimatedBackground from '../components/auth/AnimatedBackground'
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

export default function OtpVerificationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { isDark, toggleTheme } = useUiStore()

  const email = searchParams.get('email') || ''
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [success, setSuccess] = useState(false)
  const [showProfileStep, setShowProfileStep] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropFile, setCropFile] = useState(null)
  const [cropSrc, setCropSrc] = useState(null)
  const [validationError, setValidationError] = useState('')
  const fileInputRef = useRef(null)
  const inputsRef = useRef([])

  useEffect(() => {
    if (!email) navigate('/login')
  }, [email, navigate])

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [cooldown])

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) inputsRef.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleResend = async () => {
    setSending(true)
    try {
      await resendOtp(email)
      toast.success('OTP sent! Check your inbox.')
      setCooldown(30)
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to resend')
    } finally {
      setSending(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) return
    setVerifying(true)
    try {
      const { data } = await verifyOtp(email, code)
      login(data.data.access_token, data.data.refresh_token, data.data.user)
      setSuccess(true)
      setTimeout(() => setShowProfileStep(true), 1500)
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Verification failed')
      setOtp(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  const handleFileSelect = async (e) => {
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
    setUploading(true)
    try {
      const img = await loadImage(cropFile)
      const croppedBlob = await getCroppedBlob(img, croppedAreaPixels)
      const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' })
      const res = await uploadFile(croppedFile)
      const { data: updated } = await updateMe({
        profile_photo_url: res.data.data.cloudinary_url,
        profile_photo_public_id: res.data.data.cloudinary_public_id,
      })
      useAuthStore.getState().setUser(updated.data.user)
      toast.success('Profile photo added!')
      setCropSrc(null)
      setCropFile(null)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleCropCancel = () => {
    setCropSrc(null)
    setCropFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSkip = () => {
    navigate('/dashboard')
  }

  const isComplete = otp.join('').length === 6

  return (
    <div className={`relative min-h-screen font-body overflow-hidden ${isDark ? 'text-white' : 'text-slate-900'}`}>
      <AnimatedBackground isDark={isDark} />

      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isDark
              ? 'bg-white/[0.06] border border-white/[0.08] text-yellow-400 hover:bg-white/[0.1]'
              : 'bg-white/70 border border-slate-200/60 text-slate-600 hover:bg-white shadow-sm'
          }`}
        >
          {isDark ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>
      </div>

      {/* Center Layout */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          {showProfileStep ? (
            <div
              key="profile"
              className="w-full max-w-md"
            >
              <div className={`
                relative overflow-hidden
                rounded-[24px] p-8 sm:p-10
                transition-all duration-500 text-center
                ${isDark
                  ? 'bg-[rgba(15,23,42,0.7)] border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                  : 'bg-[rgba(255,255,255,0.75)] border border-[rgba(255,255,255,0.8)] shadow-[0_8px_32px_rgba(0,0,0,0.06)]'
                }
                backdrop-blur-[20px] backdrop-saturate-[1.8]
                [-webkit-backdrop-filter:blur(20px)_saturate(1.8)]
              `}>
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${
                  isDark ? 'bg-accent-blue/[0.04]' : 'bg-blue-400/10'
                }`} />
                <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${
                  isDark ? 'bg-accent-indigo/[0.04]' : 'bg-indigo-400/10'
                }`} />

                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                    isDark ? 'bg-accent-blue/15' : 'bg-blue-50'
                  }`}>
                    <svg className={`w-8 h-8 ${isDark ? 'text-accent-blue' : 'text-blue-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>

                  <h2 className={`text-xl font-heading font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Complete Your Profile
                  </h2>
                  <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Add a profile picture to help your friends recognise you.
                  </p>

                  <div className="flex flex-col items-center gap-6">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer group relative"
                    >
                      {uploading ? (
                        <div className="w-24 h-24 rounded-full bg-primary-lighter flex items-center justify-center">
                          <svg className="animate-spin h-8 w-8 text-accent-blue" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      ) : (
                        <>
                          <Avatar user={useAuthStore.getState().user} size="lg" className="!w-24 !h-24 !text-3xl !shadow-md ring-4 ring-accent-blue/30" />
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    {validationError && (
                      <p className="text-xs text-accent-red font-medium">{validationError}</p>
                    )}

                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Recommended: Square image (minimum 256 × 256 px). JPG, PNG or WebP. Max 5 MB.
                    </p>

                    <div className="flex gap-3 w-full">
                      <button
                        onClick={handleSkip}
                        disabled={uploading}
                        className={`flex-1 font-semibold py-3 px-6 rounded-xl transition-all duration-300 text-sm ${
                          isDark
                            ? 'bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:bg-white/[0.1]'
                            : 'bg-white/70 border border-slate-200/60 text-slate-600 hover:bg-white shadow-sm'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`flex-1 font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center text-sm ${
                          isDark
                            ? 'bg-gradient-to-r from-accent-blue to-accent-indigo hover:from-blue-400 hover:to-indigo-400 text-white shadow-lg shadow-accent-blue/20'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {uploading ? (
                          <span className="flex items-center gap-2.5">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Uploading...
                          </span>
                        ) : (
                          'Choose Photo'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                  isDark ? 'bg-accent-green/15' : 'bg-emerald-50'
                }`}
              >
                <svg className={`w-10 h-10 ${isDark ? 'text-accent-green' : 'text-emerald-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`text-2xl font-heading font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                Verified Successfully!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                Welcome to TripSync. Setting up your profile...
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className={`
                relative overflow-hidden
                rounded-[24px] p-8 sm:p-10
                transition-all duration-500 text-center
                ${isDark
                  ? 'bg-[rgba(15,23,42,0.7)] border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                  : 'bg-[rgba(255,255,255,0.75)] border border-[rgba(255,255,255,0.8)] shadow-[0_8px_32px_rgba(0,0,0,0.06)]'
                }
                backdrop-blur-[20px] backdrop-saturate-[1.8]
                [-webkit-backdrop-filter:blur(20px)_saturate(1.8)]
              `}>
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${
                  isDark ? 'bg-accent-blue/[0.04]' : 'bg-blue-400/10'
                }`} />
                <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${
                  isDark ? 'bg-accent-indigo/[0.04]' : 'bg-indigo-400/10'
                }`} />

                <div className="relative z-10">
                  {/* Mail Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                      isDark ? 'bg-accent-blue/15' : 'bg-blue-50'
                    }`}
                  >
                    <svg className={`w-8 h-8 ${isDark ? 'text-accent-blue' : 'text-blue-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M22 4L12 13 2 4" />
                    </svg>
                  </motion.div>

                  <h2 className={`text-xl font-heading font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Verify your email
                  </h2>
                  <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enter the 6-digit code sent to<br />
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{email}</span>
                  </p>

                  <form onSubmit={handleVerify} className="space-y-8">
                    {/* OTP Inputs */}
                    <div className="flex gap-2 justify-center px-1">
                      {otp.map((digit, i) => (
                        <motion.input
                          key={i}
                          ref={el => inputsRef.current[i] = el}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleChange(i, e.target.value)}
                          onKeyDown={e => handleKeyDown(i, e)}
                          whileFocus={{ scale: 1.02 }}
                          className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl border outline-none transition-all duration-300 ${
                            digit
                              ? isDark
                                ? 'border-accent-blue/50 bg-white/[0.06] text-white shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
                                : 'border-blue-400 bg-white text-slate-900 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
                              : isDark
                                ? 'border-white/[0.08] bg-white/[0.02] text-white hover:border-white/[0.15]'
                                : 'border-slate-200 bg-white/50 text-slate-900 hover:border-slate-300'
                          }`}
                        />
                      ))}
                    </div>

                    <motion.button
                      type="submit"
                      disabled={verifying || !isComplete}
                      whileHover={!verifying && isComplete ? { scale: 1.01 } : {}}
                      whileTap={!verifying && isComplete ? { scale: 0.99 } : {}}
                      className={`w-full font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center text-sm ${
                        isDark
                          ? 'bg-gradient-to-r from-accent-blue to-accent-indigo hover:from-blue-400 hover:to-indigo-400 text-white shadow-lg shadow-accent-blue/20'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {verifying ? (
                        <span className="flex items-center gap-2.5">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Verifying...
                        </span>
                      ) : (
                        'Verify Email'
                      )}
                    </motion.button>
                  </form>

                  {/* Resend */}
                  <div className="mt-6 text-sm">
                    {cooldown > 0 ? (
                      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                        Resend in <span className="font-mono font-medium">{cooldown}s</span>
                      </span>
                    ) : (
                      <motion.button
                        onClick={handleResend}
                        disabled={sending}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`font-medium transition-colors ${
                          isDark ? 'text-accent-blue hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        } disabled:opacity-50`}
                      >
                        {sending ? 'Sending...' : 'Resend OTP'}
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
