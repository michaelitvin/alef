// Drawn UI icons for the tower (ported from the prototype). No emoji in the child's UI: emoji depend on the device's font
// (older Android tablets lack some; the headless test browser has none) and don't match the art. Shapes follow the legibility
// rules: nothing that looks like a nikkud mark (no dot clusters, no short bars in rows).
import type { CSSProperties } from 'react'
import type { IconName } from '../types'

const GOLD = '#ffd34d'
const CREAM = '#fff6d8'

function paths(name: IconName) {
  switch (name) {
    case 'bossHeart':
      return <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.5 5c2 0 3.6 1.1 5.5 3.2C13.9 6.1 15.5 5 17.5 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" fill="#b48cff" stroke="#fff" strokeOpacity={0.5} />
    case 'sparkle':
      return <path d="M12 1.5l2.4 8.1 8.1 2.4-8.1 2.4L12 22.5l-2.4-8.1L1.5 12l8.1-2.4z" fill={GOLD} />
    case 'flame':
      return (<><path d="M12 1.5c1.2 4.3 6.5 6.4 6.5 12.6a6.5 6.5 0 0 1-13 0c0-3.3 2-5.5 3.2-7.6.2 2.2 1.1 3.4 2.2 3.6-.2-3.4-.6-5.8 1.1-8.6z" fill="#ff7a1a" /><path d="M12 11c.8 2.3 3.2 3.4 3.2 6.1a3.2 3.2 0 0 1-6.4 0c0-1.7 1-2.9 1.7-4 .1 1.1.6 1.7 1.1 1.8-.1-1.8-.3-2.6.4-3.9z" fill={GOLD} /></>)
    case 'bolt':
      return <path d="M13.5 1.5L4 13.8h6.6L9.3 22.5l9.7-12.6h-6.7z" fill={GOLD} stroke="#fff" strokeWidth={0.8} />
    case 'swords':
      return (<><path d="M4 2.5l9.7 9.7-1.5 1.5L2.5 4V2.5z" fill={CREAM} /><path d="M20 2.5L10.3 12.2l1.5 1.5L21.5 4V2.5z" fill={CREAM} /><path d="M6.5 14.5l3 3-3.3 3.3-3-3zM17.5 14.5l-3 3 3.3 3.3 3-3z" fill={GOLD} /></>)
    case 'speaker':
      return (<><path d="M3 9h4l5.5-4.5v15L7 15H3z" fill={CREAM} /><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="#8fd8ff" strokeWidth={2} fill="none" strokeLinecap="round" /></>)
    case 'speakerOff':
      return (<><path d="M3 9h4l5.5-4.5v15L7 15H3z" fill={CREAM} /><path d="M15.5 9l6 6M21.5 9l-6 6" stroke="#ff4d6a" strokeWidth={2.2} strokeLinecap="round" /></>)
    case 'talk':
      // speech bubble with sound waves outside it — nothing inside (a bar inside would look like patach)
      return (<><path d="M2.5 5h13v9H8l-4 4v-4H2.5z" fill={CREAM} /><path d="M18 6.5a5 5 0 0 1 0 6M20.5 4.5a8 8 0 0 1 0 10" stroke="#8fd8ff" strokeWidth={1.8} fill="none" strokeLinecap="round" /></>)
    case 'puff':
      return <path d="M3 13c2-3 4 3 6 0s4 3 6 0 4 3 6 0M5 8c1.5-2 3 2 4.5 0M13 18c1.5-2 3 2 4.5 0" stroke="#d8c8ff" strokeWidth={2} fill="none" strokeLinecap="round" />
    case 'bonk':
      return <path d="M12 1l2.2 6 6.1-2.4-2.6 5.9 5.3 1.5-5.3 1.6 2.6 5.9-6.1-2.4L12 23l-2.2-5.9-6.1 2.4 2.6-5.9L1 12l5.3-1.5-2.6-5.9 6.1 2.4z" fill="#ff4d6a" stroke={CREAM} strokeWidth={1} />
  }
}

export function Icon({ name, size = 24, style, className }: { name: IconName; size?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg data-icon={name} viewBox="0 0 24 24" width={size} height={size} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} className={className} aria-hidden>
      {paths(name)}
    </svg>
  )
}
