const API_PREFIX = import.meta.env.VITE_API_URL || ''

export const uploadFile = async (file) => {
  const form = new FormData()
  form.append('file', file)
  const token = localStorage.getItem('access_token')
  const res = await fetch(API_PREFIX + '/api/v1/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Upload failed')
    err.response = { data, status: res.status }
    throw err
  }
  return { data }
}
