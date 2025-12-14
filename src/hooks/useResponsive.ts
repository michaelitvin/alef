import { useState, useEffect, useCallback } from 'react'
import { breakpoints, getDeviceType, type DeviceType } from '../styles/breakpoints'

/**
 * Hook for responsive design - detects current device type and breakpoint
 */
export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  })

  const [deviceType, setDeviceType] = useState<DeviceType>(() =>
    typeof window !== 'undefined' ? getDeviceType(window.innerWidth) : 'desktop'
  )

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth
      const height = window.innerHeight

      setWindowSize({ width, height })
      setDeviceType(getDeviceType(width))
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Convenience booleans
  const isMobile = deviceType === 'mobile'
  const isTablet = deviceType === 'tablet'
  const isDesktop = deviceType === 'desktop'

  // Check if width is at least a breakpoint
  const isAtLeast = useCallback(
    (breakpoint: keyof typeof breakpoints) => {
      return windowSize.width >= breakpoints[breakpoint]
    },
    [windowSize.width]
  )

  // Check if width is below a breakpoint
  const isBelow = useCallback(
    (breakpoint: keyof typeof breakpoints) => {
      return windowSize.width < breakpoints[breakpoint]
    },
    [windowSize.width]
  )

  // Check orientation
  const isPortrait = windowSize.height > windowSize.width
  const isLandscape = windowSize.width > windowSize.height

  // Touch capability (approximation based on device type)
  const isTouch = isMobile || isTablet

  return {
    windowSize,
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    isPortrait,
    isLandscape,
    isTouch,
    isAtLeast,
    isBelow,
  }
}

/**
 * Hook for detecting reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return reducedMotion
}

/**
 * Hook for safe area insets (notched devices)
 */
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })

  useEffect(() => {
    // Get CSS custom properties for safe area
    const computedStyle = getComputedStyle(document.documentElement)

    const getInset = (property: string): number => {
      const value = computedStyle.getPropertyValue(property)
      return parseInt(value, 10) || 0
    }

    setSafeArea({
      top: getInset('--safe-area-inset-top') || 0,
      right: getInset('--safe-area-inset-right') || 0,
      bottom: getInset('--safe-area-inset-bottom') || 0,
      left: getInset('--safe-area-inset-left') || 0,
    })
  }, [])

  return safeArea
}

export default useResponsive
