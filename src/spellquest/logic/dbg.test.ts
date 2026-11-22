import { it } from 'vitest'
import { strokesOf, type Pt } from '../data/strokes'
import { resample, LetterChecker } from './recognizer'
const dense = (st: Pt[]) => resample(st, 56)
it('dbg', () => {
  const d = strokesOf('ע', 'print'); const v = d.variants[0]
  const p = dense(v[0].pts)
  // reaches into the checker's private state for this debug print
  type Track = { vi: number; idx: number; pending: unknown[] }
  const c = new LetterChecker(d) as unknown as { add(p: Pt[]): unknown; alive: Track[]; step(t: Track, p: Pt[]): unknown }
  console.log('A', JSON.stringify(c.add(p.slice(0, 28))), JSON.stringify(c.alive.map((t) => [t.vi, t.idx, t.pending.length])))
  for (const t of c.alive) console.log('S', t.vi, JSON.stringify(c.step(t, p.slice(29))).slice(0, 80))
})
