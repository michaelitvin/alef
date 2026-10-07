// Drawn UI icons for the duel (ported from the prototype). No emoji in the child's UI: emoji depend on the device's font
// (older Android tablets lack some; the headless test browser has none) and don't match the art. Shapes follow the legibility
// rules: nothing that looks like a nikkud mark (no dot clusters, no short bars in rows).
import type { CSSProperties } from 'react'

export type IconName =
  | 'heart' | 'heartEmpty' | 'sparkle' | 'pause' | 'play' | 'replay' | 'eye' | 'ear' | 'shield' | 'flame'
  | 'bolt' | 'swords' | 'speaker' | 'speakerOff' | 'talk' | 'puff' | 'trophy' | 'music' | 'musicOff'
  | 'chart' | 'bonk' | 'wand' | 'bossHeart' | 'home'

const GOLD = '#ffd34d'
const CREAM = '#fff6d8'

function paths(name: IconName) {
  switch (name) {
    case 'heart':
    case 'bossHeart':
      return <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.5 5c2 0 3.6 1.1 5.5 3.2C13.9 6.1 15.5 5 17.5 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" fill={name === 'heart' ? '#ff4d6a' : '#b48cff'} stroke="#fff" strokeOpacity={0.5} />
    case 'heartEmpty':
      return <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.5 5c2 0 3.6 1.1 5.5 3.2C13.9 6.1 15.5 5 17.5 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" fill="rgba(0,0,0,0.35)" stroke={CREAM} strokeOpacity={0.45} strokeWidth={1.5} />
    case 'sparkle':
      return <path d="M12 1.5l2.4 8.1 8.1 2.4-8.1 2.4L12 22.5l-2.4-8.1L1.5 12l8.1-2.4z" fill={GOLD} />
    case 'pause':
      return (<><rect x="6" y="4" width="4.5" height="16" rx="1.5" fill={CREAM} /><rect x="13.5" y="4" width="4.5" height="16" rx="1.5" fill={CREAM} /></>)
    case 'play':
      return <path d="M7 4.5v15c0 .8.9 1.3 1.6.8l11-7.5c.6-.4.6-1.2 0-1.6l-11-7.5C7.9 3.2 7 3.7 7 4.5z" fill="#2a0f00" />
    case 'replay':
      return <path d="M12 4a8 8 0 1 1-7.7 10.1l2.6-.7A5.3 5.3 0 1 0 12 6.7V10L6.5 5.4 12 1z" fill="#2a0f00" />
    case 'eye':
      return (<><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" fill={CREAM} /><circle cx="12" cy="12" r="4.2" fill="#3c2a7a" /></>)
    case 'ear':
      return <path d="M14 2.5c-4.4 0-7.5 3.2-7.5 7.3 0 2.2.8 3.4 1.6 4.6.7 1.1 1.4 2.2 1.4 4.1 0 1.6 1.1 3 2.8 3 1.6 0 2.6-1 3.1-2.6.4-1.3 1-2 2.1-3 1.3-1.2 2.5-2.9 2.5-5.9 0-4.3-2.9-7.5-6-7.5zm-1.5 6c0-1.3 1-2.2 2.1-2.2s2.1.9 2.1 2.2c0 .9-.4 1.5-1 2-.5.4-.6.8-.6 1.4h-1.9c0-1.2.4-2 1.1-2.6.4-.3.5-.5.5-.8z" fill={CREAM} />
    case 'shield':
      return <path d="M12 1.8l8.5 3.2v6.3c0 5.3-3.6 9.4-8.5 11-4.9-1.6-8.5-5.7-8.5-11V5z" fill="#8fd8ff" stroke={CREAM} strokeWidth={1} />
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
    case 'trophy':
      return <path d="M7 3h10v2h3.5v2.5c0 2.8-2 4.6-4.4 4.9A5.4 5.4 0 0 1 13 15.5V18h3.5v3h-9v-3H11v-2.5a5.4 5.4 0 0 1-3.1-3.1C5.5 12.1 3.5 10.3 3.5 7.5V5H7zm0 4.5H5.5c0 1.4.7 2.4 1.7 2.8A6 6 0 0 1 7 8.9zm10 0v1.4c0 .5 0 .9-.2 1.4 1-.4 1.7-1.4 1.7-2.8z" fill={GOLD} />
    case 'music':
      return <path d="M9 17.5a3 3 0 1 1-2-2.8V4.5l11-2.2v12.2a3 3 0 1 1-2-2.8V6.1l-7 1.4z" fill={CREAM} />
    case 'musicOff':
      return (<><path d="M9 17.5a3 3 0 1 1-2-2.8V4.5l11-2.2v12.2a3 3 0 1 1-2-2.8V6.1l-7 1.4z" fill={CREAM} opacity={0.45} /><path d="M3 3l18 18" stroke="#ff4d6a" strokeWidth={2.4} strokeLinecap="round" /></>)
    case 'chart':
      return <path d="M4 20V10h3.5v10zm6.25 0V4h3.5v16zm6.25 0v-7H20v7z" fill={CREAM} />
    case 'bonk':
      return <path d="M12 1l2.2 6 6.1-2.4-2.6 5.9 5.3 1.5-5.3 1.6 2.6 5.9-6.1-2.4L12 23l-2.2-5.9-6.1 2.4 2.6-5.9L1 12l5.3-1.5-2.6-5.9 6.1 2.4z" fill="#ff4d6a" stroke={CREAM} strokeWidth={1} />
    case 'home':
      return <path d="M12 3l9 8h-2.5v9.5h-5v-6h-3v6h-5V11H3z" fill="#2a0f00" />
    case 'wand':
      return (<><path d="M3 21L15 9" stroke="#b48cff" strokeWidth={3} strokeLinecap="round" /><path d="M17 2l1.2 3.8L22 7l-3.8 1.2L17 12l-1.2-3.8L12 7l3.8-1.2z" fill={GOLD} /></>)
  }
}

export function Icon({ name, size = 24, style, className }: { name: IconName; size?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg data-icon={name} viewBox="0 0 24 24" width={size} height={size} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} className={className} aria-hidden>
      {paths(name)}
    </svg>
  )
}
