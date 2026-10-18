// All icons are SVG (rule: no emoji; the old tablet shows missing emoji as squares).
import { useId } from 'react'
import { HAND_COLORS } from './ClockFace'

type P = { size?: number }
export const CheckIcon = ({ size = 72 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <circle cx="50" cy="50" r="46" fill="#3c8d2f" stroke="#fff" strokeWidth="4" />
    <path d="M28 52 L44 68 L74 34" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const SpeakerIcon = ({ size = 36 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <path d="M18 38 H36 L58 20 V80 L36 62 H18 Z" fill="#5a3417" />
    <path d="M68 34 Q80 50 68 66 M76 24 Q96 50 76 76" fill="none" stroke="#5a3417" strokeWidth="7" strokeLinecap="round" />
  </svg>
)
export const PlayIcon = ({ size = 96 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <circle cx="50" cy="50" r="46" fill="#3c8d2f" stroke="#fff" strokeWidth="4" />
    <path d="M40 30 L72 50 L40 70 Z" fill="#fff" />
  </svg>
)
export const HomeIcon = ({ size = 48 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <path d="M14 50 L50 18 L86 50 V86 H60 V62 H40 V86 H14 Z" fill="#fff8e7" stroke="#5a3417" strokeWidth="6" strokeLinejoin="round" />
  </svg>
)
/** One gear tooth outline (radius 46), shared by the gold gears. */
const GEAR_PATH = 'M-9 -46 h18 l3 12 a36 36 0 0 1 10 5 l11 -6 13 13 -6 11 a36 36 0 0 1 5 10 l12 3 v18 l-12 3 a36 36 0 0 1 -5 10 l6 11 -13 13 -11 -6 a36 36 0 0 1 -10 5 l-3 12 h-18 l-3 -12 a36 36 0 0 1 -10 -5 l-11 6 -13 -13 6 -11 a36 36 0 0 1 -5 -10 l-12 -3 v-18 l12 -3 a36 36 0 0 1 5 -10 l-6 -11 13 -13 11 6 a36 36 0 0 1 10 -5 z'
const GoldGear = ({ fill, shine }: { fill: string; shine?: boolean }) => (
  <g stroke="#7a5222" strokeWidth="5" strokeLinejoin="round">
    <path d={GEAR_PATH} fill={fill} />
    <circle r="11" fill="#7a5222" />
    {shine && <path d="M-26 -18 a32 32 0 0 1 22 -14" fill="none" stroke="#fffbe0" strokeWidth="6" strokeLinecap="round" />}
  </g>
)
const GoldDefs = ({ id }: { id: string }) => (
  <defs>
    <radialGradient id={id} cx="35%" cy="30%" r="75%">
      <stop offset="0" stopColor="#fff2a8" /><stop offset="0.45" stopColor="#f2c14e" /><stop offset="1" stopColor="#b9821f" />
    </radialGradient>
  </defs>
)

/** One shiny gold gear: a reward he earns (the bonus tries), not a settings cog. */
export const GearIcon = ({ size = 32 }: P) => {
  const id = useId()
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} aria-hidden>
      <GoldDefs id={id} />
      <GoldGear fill={`url(#${id})`} shine />
    </svg>
  )
}

/**
 * The gears he has earned: a heap of gold gears in a wooden tray. The parent 2026-10-17: a single gear at the top right
 * looked like a settings button.
 */
export const GearPileIcon = ({ size = 48 }: P) => {
  const id = useId()
  const fill = `url(#${id})`
  return (
    <svg viewBox="-60 -50 120 100" width={size * 1.2} height={size} aria-hidden>
      <GoldDefs id={id} />
      <g transform="translate(-22 6) scale(0.42)"><GoldGear fill={fill} /></g>
      <g transform="translate(22 8) scale(0.38) rotate(20)"><GoldGear fill={fill} /></g>
      <g transform="translate(0 -12) scale(0.5) rotate(10)"><GoldGear fill={fill} shine /></g>
      <path d="M-52 18 L52 18 L44 44 L-44 44 Z" fill="#9a6232" stroke="#5a3417" strokeWidth="3" strokeLinejoin="round" />
      <path d="M-46 27 L46 27" stroke="#7a4a22" strokeWidth="2" />
    </svg>
  )
}
// Parent settings: three sliders. Deliberately not the gear (the gear is the currency counter).
export const SlidersIcon = ({ size = 28 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <g stroke="#5b4a33" strokeWidth="8" strokeLinecap="round">
      <line x1="16" y1="26" x2="84" y2="26" /><line x1="16" y1="50" x2="84" y2="50" /><line x1="16" y1="74" x2="84" y2="74" />
    </g>
    <g fill="#fff" stroke="#5b4a33" strokeWidth="6">
      <circle cx="34" cy="26" r="10" /><circle cx="64" cy="50" r="10" /><circle cx="42" cy="74" r="10" />
    </g>
  </svg>
)
export const HandShortIcon = ({ size = 64 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <line x1="50" y1="78" x2="50" y2="40" stroke={HAND_COLORS.hour} strokeWidth="14" strokeLinecap="round" />
    <circle cx="50" cy="78" r="8" fill="#333" />
  </svg>
)
export const HandLongIcon = ({ size = 64 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <line x1="50" y1="88" x2="50" y2="10" stroke={HAND_COLORS.minute} strokeWidth="8" strokeLinecap="round" />
    <circle cx="50" cy="88" r="7" fill="#333" />
  </svg>
)
/** A small wall clock (the summary's "clocks fixed today"). */
export const ClockIcon = ({ size = 48 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <circle cx="50" cy="50" r="44" fill="#fff8e7" stroke="#8a5a2b" strokeWidth="8" />
    <line x1="50" y1="50" x2="50" y2="28" stroke={HAND_COLORS.hour} strokeWidth="8" strokeLinecap="round" />
    <line x1="50" y1="50" x2="72" y2="50" stroke={HAND_COLORS.minute} strokeWidth="5" strokeLinecap="round" />
  </svg>
)

/** A light bulb: the hint button (shows the clock hint that fits this time). */
export const HintIcon = ({ size = 40 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <path d="M50 12 C30 12 20 28 20 42 C20 54 28 60 34 68 L34 76 L66 76 L66 68 C72 60 80 54 80 42 C80 28 70 12 50 12 Z" fill="#ffd54a" stroke="#5a3417" strokeWidth="5" strokeLinejoin="round" />
    <path d="M38 82 H62 M41 90 H59" stroke="#5a3417" strokeWidth="6" strokeLinecap="round" />
    <path d="M36 40 C36 32 42 26 50 25" fill="none" stroke="#fffbe0" strokeWidth="6" strokeLinecap="round" />
  </svg>
)
