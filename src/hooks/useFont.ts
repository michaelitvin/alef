import { useEffect } from 'react'
import { useProgressStore } from '../stores/progressStore'
import { fonts } from '../styles/theme'

/**
 * Hook to apply font to the document root via CSS variable
 * Should be called once at the app level
 */
export function useFontEffect(): void {
  const font = useProgressStore((state) => state.settings.font)

  useEffect(() => {
    const fontFamily = fonts[font] || fonts.default
    document.documentElement.style.setProperty('--font-hebrew', fontFamily)
  }, [font])
}
