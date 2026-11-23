// The path of the tower's minigames on the home screen (spec: one duel, Part 4): the stations in path order, each with
// what it teaches (for the parent: never the minigame's name) and how its picture is drawn.
import type { ScreenId } from '../../spellquest/logic/predict'
import { useEffect, useState } from 'react'
import type { SpellQuestSave } from '../../spellquest/store'
import { SAVE_VERSION, migrateSave } from '../../spellquest/saveFormat'
import { openScreens } from '../../spellquest/station'
import { rating, screenRecent } from '../../spellquest/logic/mastery'
import { HEBREW_SPELL_AVAILABLE } from '../../shared/hebrewSpell'
import { useProgressStore } from '../../stores/progressStore'
import { SPELLQUEST_SAVE_KEY } from '../../shared/saveKeys'

export interface Station {
  id: ScreenId
  /** what is learned there (the caption, for the parent) */
  learn: string
  /** img: a picture; orb: an orb with בָּ; glyph: א in print; hand: א in handwriting */
  pic: 'img' | 'orb' | 'glyph' | 'hand'
}

const ALL_STATIONS: Station[] = [
  { id: 'tower', learn: 'ניקוד לפי צליל', pic: 'img' },
  { id: 'broom', learn: 'אותיות והברות לפי צליל', pic: 'orb' },
  { id: 'ghosts', learn: 'אותיות דומות', pic: 'img' },
  { id: 'cauldron', learn: 'בניית הברה', pic: 'img' },
  { id: 'ladder', learn: 'משפחות הברות, דגש', pic: 'img' },
  { id: 'doors', learn: 'קריאת מילים', pic: 'img' },
  { id: 'spell', learn: 'כתיב מילים', pic: 'img' },
  { id: 'draw', learn: 'אותיות דפוס', pic: 'glyph' },
  { id: 'draw-hand', learn: 'אותיות כתב יד', pic: 'hand' },
]

/** the Hebrew path's stations: the spell book only where it is out (src/shared/hebrewSpell.ts) */
const STATIONS = ALL_STATIONS.filter((s) => s.id !== 'spell' || HEBREW_SPELL_AVAILABLE)

// ---- the state of the path, read from the saves (the home never creates or writes the Spell Quest save)

const PROGRESS_KEY = 'alef-progress'

const readSaved = (key: string): { state: Record<string, unknown>; version: number } | null => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const p = JSON.parse(raw) as { state?: unknown; version?: unknown }
    const s = p?.state
    return s && typeof s === 'object' ? { state: s as Record<string, unknown>, version: typeof p.version === 'number' ? p.version : 0 } : null
  } catch {
    return null
  }
}
const readState = (key: string) => readSaved(key)?.state ?? null

/**
 * Spell Quest's save, read only (null when he has none, or it cannot be read). An older save is converted here as Spell Quest will
 * convert it on its next start (its stations open, drawing on), without writing it.
 */
function readSpellQuestSave(): Partial<SpellQuestSave> | null {
  const saved = readSaved(SPELLQUEST_SAVE_KEY)
  if (!saved) return null
  return saved.version < SAVE_VERSION ? migrateSave(saved.state, saved.version) : saved.state as Partial<SpellQuestSave>
}

/** the tower's recent answers per mark: the saved ones (Spell Quest's tower writes them on its own page), else the store's */
function readTowerRecent(): Record<string, string> {
  const d = readState(PROGRESS_KEY)?.tower as { recent?: Record<string, string> } | undefined
  return d?.recent ?? useProgressStore.getState().tower?.recent ?? {}
}

export interface StationState { id: ScreenId; learn: string; pic: Station['pic']; open: boolean; rating: 0 | 1 | 2 | 3 }

/**
 * Each station: open when it is in his cycle (Spell Quest open, or his tower marks mastered; the tower always), and its
 * 0–3 rating from his recent answers there. A missing save reads as a fresh one. Open stations first, then the locked
 * ones, each group in path order.
 */
function stationState(save: Partial<SpellQuestSave> | null, towerRecent: Record<string, string>): StationState[] {
  const open = openScreens(save as Parameters<typeof openScreens>[0], towerRecent)
  const recent = (save?.recent ?? {}) as Record<string, string>
  const all = STATIONS.map((s) => {
    const isOpen = open.includes(s.id)
    return { ...s, open: isOpen, rating: isOpen ? rating(screenRecent(s.id, recent, towerRecent)) : 0 as const }
  })
  return [...all.filter((s) => s.open), ...all.filter((s) => !s.open)]
}

/** The path's state, read again when the page shows (coming back from Spell Quest in the same tab, or from the back button). */
export function useStations(): StationState[] {
  const read = () => stationState(readSpellQuestSave(), readTowerRecent())
  const [st, setSt] = useState(read)
  useEffect(() => {
    const again = () => { if (document.visibilityState !== 'hidden') setSt(read()) }
    again()
    document.addEventListener('visibilitychange', again)
    window.addEventListener('pageshow', again)
    return () => { document.removeEventListener('visibilitychange', again); window.removeEventListener('pageshow', again) }
  }, [])
  return st
}