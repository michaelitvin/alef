// The English section's sound units: one chip for each, by its stage. A tap shows right, wrong and helped (an answer after
// the hint is neither right nor wrong) and the unit's mix-ups.
import { useState } from 'react'
import type { Tally } from '../../../shared/adaptive'
import { UNITS } from '../content/units'
import { useEnglishStore } from '../store'

export type UnitState = 'knows' | 'learning' | 'unseen'

/** right = seen − wrong − helped (a timeout is not right either); never seen − wrong */
export const rightOf = (t: Tally | undefined) => Math.max(0, (t?.seen ?? 0) - (t?.wrong ?? 0) - (t?.timeout ?? 0) - (t?.helped ?? 0))

/** knows: at least 3 right and at least 8 in 10 of what he answered; else learning; unseen: not asked yet */
export function unitState(t: Tally | undefined): UnitState {
  const seen = t?.seen ?? 0
  if (!seen) return 'unseen'
  const right = rightOf(t)
  return right >= 3 && right / seen >= 0.8 ? 'knows' : 'learning'
}

const LABEL: Record<UnitState, string> = { knows: 'knows', learning: 'learning now', unseen: 'not seen yet' }
const COLOR: Record<UnitState, string> = { knows: '#d6f0d6', learning: '#fff0c2', unseen: '#eee' }

export default function Units() {
  const tallies = useEnglishStore((s) => s.tallies)
  const letters = useEnglishStore((s) => s.confusions?.letters)
  const tower = useEnglishStore((s) => s.tower?.confusions)
  const [open, setOpen] = useState<string | null>(null)
  const stages = [...new Set(UNITS.map((u) => u.stage))].sort((a, b) => a - b)
  const mixups = (id: string): [string, number][] => {
    const row: Record<string, number> = {}
    for (const src of [letters?.[id], tower?.[id]]) for (const [k, n] of Object.entries(src ?? {})) if (k !== id) row[k] = (row[k] ?? 0) + n
    return Object.entries(row).sort((a, b) => b[1] - a[1])
  }
  const shown = open ? UNITS.find((u) => u.id === open) : undefined
  const t = shown ? tallies[shown.id] : undefined
  return (
    <div data-spellquest-en-units>
      <h3>Sound units</h3>
      {stages.map((st) => (
        <p key={st} data-units-stage={st}>
          <strong>Stage {st}: </strong>
          {UNITS.filter((u) => u.stage === st).map((u) => {
            const s = unitState(tallies[u.id])
            return (
              <button key={u.id} type="button" data-unit={u.id} data-state={s} aria-pressed={open === u.id} title={LABEL[s]}
                style={{ margin: 2, background: COLOR[s], fontFamily: 'Andika, sans-serif' }} onClick={() => setOpen(open === u.id ? null : u.id)}>
                {u.text}{u.secondOf ? ' (2nd)' : ''}
              </button>
            )
          })}
        </p>
      ))}
      <p><small>Green: knows. Yellow: learning now. Grey: not seen yet.</small></p>
      {shown && (
        <div data-unit-detail={shown.id}>
          <strong>{shown.text}</strong> ({LABEL[unitState(t)]}): right <span data-n="right">{rightOf(t)}</span>, wrong{' '}
          <span data-n="wrong">{t?.wrong ?? 0}</span>, helped <span data-n="helped">{t?.helped ?? 0}</span>
          <div data-unit-mixups>
            {mixups(shown.id).length ? 'Mix-ups: ' + mixups(shown.id).map(([k, n]) => `${k} (${n})`).join(', ') : 'No mix-ups yet.'}
          </div>
        </div>
      )}
    </div>
  )
}
