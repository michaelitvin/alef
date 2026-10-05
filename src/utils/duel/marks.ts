import nikkudYaml from '../../data/nikkud.yaml'
import type { DuelMark, SoundGroup } from '../../types/duel'

type YamlNikkud = { id: string; name: string; soundGroup: SoundGroup }

export const SOUND_GROUPS: SoundGroup[] = ['a', 'e', 'i', 'o', 'u', 'silent']

const VAV: Record<string, DuelMark['vav']> = { 'holam-male': 'holam', shuruk: 'shuruk' }

/** The duel's view of nikkud.yaml — no new copy of the data. */
export const DUEL_MARKS: DuelMark[] = (nikkudYaml as { nikkud: YamlNikkud[] }).nikkud.map((n) => ({
  id: n.id,
  name: n.name,
  group: n.soundGroup,
  ...(VAV[n.id] ? { vav: VAV[n.id] } : {}),
}))

export function markById(id: string): DuelMark {
  const m = DUEL_MARKS.find((x) => x.id === id)
  if (!m) throw new Error(`unknown mark ${id}`)
  return m
}

/**
 * The other plain mark with the same sound (kamatz ↔ patach, tzeire ↔ segol). A vav pair (cholam/holam male,
 * kubutz/shuruk) looks different, so it is not a look-alike twin.
 */
export function twinOf(m: DuelMark): DuelMark | undefined {
  if (m.vav) return undefined
  return DUEL_MARKS.find((x) => x.group === m.group && x.id !== m.id && !x.vav)
}
