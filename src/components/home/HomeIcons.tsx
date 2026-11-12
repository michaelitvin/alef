// The home's small chrome icons, drawn as SVG (rule: no emoji), in the shelf icons' ink, gold and cream: a gear for the
// settings button, and a star, a target and a bar chart for the stats link. Decorative: the button around each is the
// control.
const INK = '#3b1d6e'
const GOLD = '#e0b26a'
const CREAM = '#fff8e7'

/** an 8-tooth gear outline around (20, 20): teeth between radius 12 and 16 */
const GEAR = (() => {
  const pts: string[] = []
  const n = 8
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const step = (Math.PI * 2) / n
    const at = (r: number, t: number) => `${(20 + r * Math.cos(t)).toFixed(2)} ${(20 + r * Math.sin(t)).toFixed(2)}`
    pts.push(at(12.5, a - step * 0.32), at(16.5, a - step * 0.2), at(16.5, a + step * 0.2), at(12.5, a + step * 0.32))
  }
  return `M${pts.join(' L')} Z`
})()

/** the settings gear */
export function GearIcon({ size = '24px' }: { size?: string }) {
  return (
    <svg viewBox="0 0 40 40" data-icon="gear" aria-hidden style={{ width: size, height: size }}>
      <path d={GEAR} fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="5" fill={CREAM} stroke={INK} strokeWidth="2" />
    </svg>
  )
}

const inline = { width: '1.15em', height: '1.15em', verticalAlign: '-0.2em', margin: '0 0.15em' }

/** a gold star (letters learned) */
export function StarIcon() {
  return (
    <svg viewBox="0 0 40 40" data-icon="star" aria-hidden style={inline}>
      <path d="M20 4 L24.7 14.6 L36 15.6 L27.4 23.2 L30 34.6 L20 28.6 L10 34.6 L12.6 23.2 L4 15.6 L15.3 14.6 Z"
        fill={GOLD} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

/** a target (accuracy) */
export function TargetIcon() {
  return (
    <svg viewBox="0 0 40 40" data-icon="target" aria-hidden style={inline}>
      <circle cx="20" cy="20" r="15" fill={CREAM} stroke={INK} strokeWidth="2" />
      <circle cx="20" cy="20" r="9.5" fill="#c0392b" stroke={INK} strokeWidth="2" />
      <circle cx="20" cy="20" r="4" fill={CREAM} stroke={INK} strokeWidth="2" />
    </svg>
  )
}

/** a bar chart (see progress) */
export function ChartIcon() {
  return (
    <svg viewBox="0 0 40 40" data-icon="chart" aria-hidden style={inline}>
      <rect x="7" y="22" width="7" height="12" rx="1" fill={GOLD} stroke={INK} strokeWidth="2" />
      <rect x="16.5" y="14" width="7" height="20" rx="1" fill="#1f5fa8" stroke={INK} strokeWidth="2" />
      <rect x="26" y="7" width="7" height="27" rx="1" fill="#c0392b" stroke={INK} strokeWidth="2" />
      <path d="M4 35 H36" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
