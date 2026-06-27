import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resendOtp } from '../../api/auth'
import useAuthStore from '../../stores/authStore'
import toast from 'react-hot-toast'

export default function UnverifiedBanner() {
  const [sending, setSending] = useState(false)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const handleResend = async () => {
    setSending(true)
    try {
      await resendOtp(user?.email)
      toast.success('OTP sent! Check your inbox.')
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'Failed to resend. Try again later.'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-accent-amber/10 border-b border-accent-amber/20 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-accent-amber font-medium">
        <span>⚠️</span>
        <span>Your email is not verified. Some features may be limited.</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/verify-otp?email=${encodeURIComponent(user?.email || '')}`)}
          className="text-sm font-semibold text-accent-amber hover:text-accent-amber/80 underline underline-offset-2 whitespace-nowrap"
        >
          Enter OTP
        </button>
        <button
          onClick={handleResend}
          disabled={sending}
          className="text-sm font-semibold text-accent-amber hover:text-accent-amber/80 underline underline-offset-2 disabled:opacity-50 whitespace-nowrap"
        >
          {sending ? 'Sending...' : 'Resend OTP'}
        </button>
      </div>
    </div>
  )
}
