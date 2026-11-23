// The English path on the home screen: the stations in path order (design Part 1), the caption of each (what is learned,
// for the parent: never the minigame's name), and their state read from the English save (read only: the home never
// creates or writes it). Open stations come first, then the locked ones, each group in path order, as on the Hebrew path.
import { useEffect, useState } from 'react'
import type { ScreenId } from '../../spellquest/logic/predict'
import { readEnglishSave } from '../../spellquest/english/saveFormat'
import { englishOpenStations, englishStationRatings } from '../../spellquest/english/station'
import { ENGLISH_AVAILABLE } from '../../spellquest/english/available'
import type { DoorsPlayable } from '../../spellquest/english/station'
import type { StationState } from './stations'

const STATIONS: { id: ScreenId; learn: string }[] = [
  { id: 'tower', learn: 'letter sounds' },
  { id: 'broom', learn: 'sounds by ear' },
  { id: 'ghosts', learn: 'look-alikes' },
  { id: 'cauldron', learn: 'the missing sound' },
  { id: 'ladder', learn: 'word chains' },
  { id: 'doors', learn: 'reading words' },
  { id: 'spell', learn: 'spelling' },
  { id: 'draw', learn: 'writing letters' },
]

export function englishStationStates(doorsPlayable: DoorsPlayable): StationState[] {
  const save = readEnglishSave()
  const open = englishOpenStations(save, doorsPlayable)
  const ratings = englishStationRatings(save)
  const all = STATIONS.map((s) => {
    const isOpen = open.includes(s.id)
    return { id: s.id, learn: s.learn, pic: 'img' as const, open: isOpen, rating: isOpen ? ratings[s.id] ?? 0 : 0 as const }
  })
  return [...all.filter((s) => s.open), ...all.filter((s) => !s.open)]
}

export interface EnglishHome { on: boolean; stations: StationState[] }

const OFF: EnglishHome = { on: false, stations: [] }

/**
 * The doors filter reaches the home by a dynamic import, and only where this build has English Spell Quest: the English
 * words and the picture map it pulls in stay out of the production home chunk.
 */
let playable: Promise<DoorsPlayable> | undefined
const loadPlayable = (): Promise<DoorsPlayable> =>
  (playable ??= import('../../spellquest/english/doorsPlayable').then((m) => m.englishDoorsPlayable))

/** the English part of home: shown when this build has English Spell Quest and the parent has not turned it off */
const readHome = (doorsPlayable: DoorsPlayable): EnglishHome =>
  ENGLISH_AVAILABLE && readEnglishSave()?.settings?.path !== false ? { on: true, stations: englishStationStates(doorsPlayable) } : OFF

/** The English part's state, read again when the page shows (coming back from the game in the same tab, or the back button). */
export function useEnglishHome(): EnglishHome {
  const [st, setSt] = useState<EnglishHome>(OFF)
  useEffect(() => {
    if (!ENGLISH_AVAILABLE) return
    let live = true
    let ready: DoorsPlayable | undefined
    const again = () => { if (ready && live && document.visibilityState !== 'hidden') setSt(readHome(ready)) }
    void loadPlayable().then((p) => { ready = p; again() })
    document.addEventListener('visibilitychange', again)
    window.addEventListener('pageshow', again)
    return () => { live = false; document.removeEventListener('visibilitychange', again); window.removeEventListener('pageshow', again) }
  }, [])
  return st
}
