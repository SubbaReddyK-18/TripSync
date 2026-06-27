import { useState, useEffect } from 'react'
import { getSystemConfig, updateSystemConfig } from '../api/admin'
import toast from 'react-hot-toast'

const TOGGLES = [
  { key: 'allowRegistrations', label: 'Allow New User Registrations', desc: 'Users can create new accounts' },
  { key: 'enableTrips', label: 'Enable Trip Creation', desc: 'Users can create and join trips' },
  { key: 'enableExpenses', label: 'Enable Expense Management', desc: 'Users can add and manage expenses' },
  { key: 'enableMemories', label: 'Enable Memories Module', desc: 'Users can upload and view memories' },
  { key: 'enablePlaces', label: 'Enable Places Module', desc: 'Users can add and view visited places' },
  { key: 'enableSettlements', label: 'Enable Settlement Module', desc: 'Users can settle payments' },
]

export default function AdminConfigPage() {
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const { data } = await getSystemConfig()
      setConfig(data.data)
    } catch {}
    setLoading(false)
  }

  const handleToggle = async (key) => {
    setSaving(true)
    const newVal = !config[key]
    const updated = { ...config, [key]: newVal }
    setConfig(updated)
    try {
      await updateSystemConfig({ [key]: newVal })
      toast.success(`${TOGGLES.find(t => t.key === key)?.label} ${newVal ? 'enabled' : 'disabled'}`)
    } catch (err) {
      setConfig(config)
      toast.error(err.response?.data?.error?.message || 'Failed to update')
    }
    setSaving(false)
  }

  if (loading) return <div className="text-center py-20 text-text-muted">Loading configuration...</div>

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-heading">System Configuration</h1>
        <p className="text-text-muted mt-1">Control major platform features</p>
      </div>

      <div className="card space-y-1">
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between py-4 border-b border-border-light last:border-0">
            <div>
              <p className="text-sm font-medium text-text-primary">{t.label}</p>
              <p className="text-xs text-text-muted mt-0.5">{t.desc}</p>
            </div>
            <button
              onClick={() => handleToggle(t.key)}
              disabled={saving}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                config[t.key] ? 'bg-accent-green' : 'bg-primary-lighter border border-border'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                config[t.key] ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-accent-amber/5 border border-accent-amber/20 rounded-xl text-sm text-text-secondary leading-relaxed">
        <p className="font-semibold text-text-primary mb-1">Note</p>
        <p>Disabling a module will hide its related pages and APIs from users. Existing data will not be affected.</p>
      </div>
    </div>
  )
}
