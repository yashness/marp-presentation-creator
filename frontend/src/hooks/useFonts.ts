import { useState, useEffect, useCallback } from 'react'
import { fetchFontFamilies, type FontFamily } from '../api/client'

export function useFonts() {
  const [fonts, setFonts] = useState<FontFamily[]>([])
  const [loading, setLoading] = useState(false)

  const loadFonts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchFontFamilies()
      setFonts(result)
    } catch (error) {
      console.error('Failed to load fonts:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadFonts()
  }, [loadFonts])

  const getFontOptions = useCallback(() => {
    const options = [
      { value: 'Sora, "Helvetica Neue", sans-serif', label: 'Sora (Default)' },
      { value: '"Inter", sans-serif', label: 'Inter' },
      { value: '"Roboto", sans-serif', label: 'Roboto' },
      { value: '"Open Sans", sans-serif', label: 'Open Sans' },
      { value: '"Lato", sans-serif', label: 'Lato' },
      { value: 'Georgia, serif', label: 'Georgia' },
      { value: '"Playfair Display", serif', label: 'Playfair Display' },
    ]

    // Add custom fonts
    fonts.forEach(family => {
      options.push({
        value: family.css_family,
        label: `${family.family_name} (Custom)`
      })
    })

    return options
  }, [fonts])

  return {
    fonts,
    loading,
    reloadFonts: loadFonts,
    getFontOptions
  }
}
