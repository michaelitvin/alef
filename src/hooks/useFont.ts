import { useEffect } from 'react'
import { useProgressStore } from '../stores/progressStore'
import { fonts } from '../styles/theme'
import type { FontType } from '../types/progress'

/**
 * Hook to get and apply the current font setting
 * Returns the current font family string
 */
export function useFont(): string {
  const font = useProgressStore((state) => state.settings.font)
  return fonts[font] || fonts.default
}

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

/**
 * Get font family for a specific font type
 */
export function getFontFamily(fontType: FontType): string {
  return fonts[fontType] || fonts.default
}

export default useFont
