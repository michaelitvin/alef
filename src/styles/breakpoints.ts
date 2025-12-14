// Responsive breakpoints based on plan.md
// Mobile: 320-767px, Tablet: 768-1023px, Desktop: 1024px+

export const breakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const

export type Breakpoint = keyof typeof breakpoints

// Media query strings for CSS-in-JS
export const mediaQueries = {
  mobile: `(min-width: ${breakpoints.mobile}px)`,
  tablet: `(min-width: ${breakpoints.tablet}px)`,
  desktop: `(min-width: ${breakpoints.desktop}px)`,
  wide: `(min-width: ${breakpoints.wide}px)`,
  // Max-width queries for mobile-first approach
  mobileOnly: `(max-width: ${breakpoints.tablet - 1}px)`,
  tabletOnly: `(min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px)`,
  tabletAndBelow: `(max-width: ${breakpoints.desktop - 1}px)`,
  // Touch capability
  touch: '(pointer: coarse)',
  mouse: '(pointer: fine)',
  // Orientation
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  // Reduced motion preference
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const

// Device type based on breakpoint
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// Get device type from window width
export function getDeviceType(width: number): DeviceType {
  if (width >= breakpoints.desktop) return 'desktop'
  if (width >= breakpoints.tablet) return 'tablet'
  return 'mobile'
}

// Responsive values helper type
export type ResponsiveValue<T> = T | { mobile?: T; tablet?: T; desktop?: T }

// Get value for current device type
export function getResponsiveValue<T>(
  value: ResponsiveValue<T>,
  deviceType: DeviceType
): T {
  if (typeof value !== 'object' || value === null) {
    return value
  }

  const responsiveObj = value as { mobile?: T; tablet?: T; desktop?: T }

  // Return specific value or fall back to smaller breakpoint
  if (deviceType === 'desktop') {
    return responsiveObj.desktop ?? responsiveObj.tablet ?? responsiveObj.mobile as T
  }
  if (deviceType === 'tablet') {
    return responsiveObj.tablet ?? responsiveObj.mobile as T
  }
  return responsiveObj.mobile as T
}
