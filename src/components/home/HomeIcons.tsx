// The home's small chrome icon, drawn as SVG (rule: no emoji), in the shelf icons' ink, gold and cream: a gear for the
// settings button. Decorative: the button around it is the control.
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
