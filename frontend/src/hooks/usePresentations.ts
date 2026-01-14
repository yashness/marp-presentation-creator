import { useState, useEffect } from 'react'
import type { Presentation } from '../api/client'
import { fetchPresentations, createPresentation, updatePresentation, deletePresentation } from '../api/client'

export function usePresentations(searchQuery: string, selectedTheme: string | null) {
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPresentations()
  }, [])

  async function loadPresentations() {
    try {
      const data = await fetchPresentations(searchQuery, selectedTheme)
      setPresentations(data)
    } catch (error) {
      console.error('Failed to load presentations:', error)
      throw error
    }
  }

  async function create(title: string, content: string, theme_id: string | null) {
    setLoading(true)
    try {
      await createPresentation({ title, content, theme_id })
      await loadPresentations()
    } catch (error) {
      console.error('Failed to create presentation:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function update(id: string, title: string, content: string, theme_id: string | null) {
    setLoading(true)
    try {
      await updatePresentation(id, { title, content, theme_id })
      await loadPresentations()
    } catch (error) {
      console.error('Failed to update presentation:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    try {
      await deletePresentation(id)
      await loadPresentations()
    } catch (error) {
      console.error('Failed to delete presentation:', error)
      throw error
    }
  }

  return {
    presentations,
    loading,
    loadPresentations,
    create,
    update,
    remove,
  }
}
