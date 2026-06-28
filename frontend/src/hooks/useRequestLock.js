import { useState, useRef, useCallback } from 'react'

export function useRequestLock() {
  const [isLoading, setIsLoading] = useState(false)
  const locked = useRef(false)

  const execute = useCallback(async (fn) => {
    if (locked.current) return
    locked.current = true
    setIsLoading(true)
    try {
      return await fn()
    } finally {
      locked.current = false
      setIsLoading(false)
    }
  }, [])

  return [isLoading, execute]
}
