// Responsive breakpoints based on plan.md
// Mobile: 320-767px, Tablet: 768-1023px, Desktop: 1024px+

export const breakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const

// Device type based on breakpoint
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// Get device type from window width
export function getDeviceType(width: number): DeviceType {
  if (width >= breakpoints.desktop) return 'desktop'
  if (width >= breakpoints.tablet) return 'tablet'
  return 'mobile'
}

