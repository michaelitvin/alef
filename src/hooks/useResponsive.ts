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
