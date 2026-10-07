// Hit-effect styles, so hits don't all look alike (playtest: "very repetitive"). Each part is dealt from its own
// shuffled deck: every option appears before any repeats, and never the same one twice in a row.
// No particles that read as game symbols: no hearts (= lives), no dots (= nikkud).
import type { Rng } from '../../types/duel'

export const PROJECTILES = ['fireball', 'iceshard', 'star', 'rainbow', 'bubble'] as const
export const BURSTS = ['confetti', 'stars', 'rings', 'sparks', 'petals'] as const
export const EXITS = ['fly', 'spin', 'pop', 'launch', 'poof'] as const
export const CASTS = ['pulse', 'twirl', 'jump'] as const
export const PALETTES = {
  fire: ['#ffd34d', '#ff9a3c', '#ff5a3c', '#ffffff'],
  ice: ['#8fd8ff', '#c9f1ff', '#5aa8ff', '#ffffff'],
  candy: ['#ff7ae0', '#ffb3f0', '#b48cff', '#ffffff'],
  forest: ['#7dff9a', '#c8ff6a', '#3fd68a', '#fff6d8'],
  gold: ['#ffd34d', '#fff1a8', '#e0a800', '#ffffff'],
  rainbow: ['#ff5a5a', '#ffd34d', '#7dff9a', '#8fd8ff', '#b48cff'],
} as const

export type Projectile = (typeof PROJECTILES)[number]
export type Burst = (typeof BURSTS)[number]
export type Exit = (typeof EXITS)[number]
export type Cast = (typeof CASTS)[number]
export type PaletteName = keyof typeof PALETTES

export interface FxStyle {
  projectile: Projectile
  burst: Burst
  exit: Exit
  palette: PaletteName
  cast: Cast
}

/** A deck that deals every option once per round of dealing, never repeating across the reshuffle seam. */
function deck<T>(rng: Rng, items: readonly T[]) {
  let pile: T[] = []
  let last: T | undefined
  return () => {
    if (!pile.length) {
      pile = [...items]
      for (let i = pile.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[pile[i], pile[j]] = [pile[j], pile[i]]
      }
      if (pile.length > 1 && pile[pile.length - 1] === last) [pile[0], pile[pile.length - 1]] = [pile[pile.length - 1], pile[0]]
    }
    last = pile.pop()!
    return last
  }
}

export function makeFxPicker(rng: Rng): () => FxStyle {
  const p = deck(rng, PROJECTILES)
  const b = deck(rng, BURSTS)
  const e = deck(rng, EXITS)
  const c = deck(rng, CASTS)
  const pal = deck(rng, Object.keys(PALETTES) as PaletteName[])
  return () => ({ projectile: p(), burst: b(), exit: e(), cast: c(), palette: pal() })
}

export const DEFAULT_FX: FxStyle = { projectile: 'fireball', burst: 'stars', exit: 'fly', palette: 'fire', cast: 'pulse' }
