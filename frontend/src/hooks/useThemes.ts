import { useState, useEffect } from 'react'
import type { Theme } from '../api/client'
import { fetchThemes } from '../api/client'

export function useThemes() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadThemes()
  }, [])

  async function loadThemes() {
    try {
      const data = await fetchThemes()
      setThemes(data)
    } catch (error) {
      console.error('Failed to load themes:', error)
    } finally {
      setLoading(false)
    }
  }

  return { themes, loading }
}
