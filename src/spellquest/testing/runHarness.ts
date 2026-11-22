// A harness that records whole sessions of the run controller, for the baseline tests of the Hebrew path: the voice
// ids in order, the tracked events and the views, with a seeded rng, fake timers and the fake audio kit. Its helpers
// (`until`, `drain`, `proceed`) are written after the ones at the top of useRun.test.tsx, which stays as it is.
import { act } from '@testing-library/react'
import { vi } from 'vitest'
import { ladderAnswerId, RunController, type DrawView, type RunOpts, type View } from '../controller'
import type { Rng } from '../../shared/adaptive'
import type { ScreenId } from '../logic/predict'
import { cycleOf } from '../logic/run'
import { DEFAULT_SETTINGS, useSpellQuestStore } from '../store'
import { memorySavePort } from '../savePort'
import { stopVoice } from '../audio/spellQuestAudio'
import { spellQuestTelemetry } from '../telemetry'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { strokesOf, type Pt } from '../data/strokes'
import { bbox, markTargets, resample } from '../logic/recognizer'
import type { Stage } from '../logic/content'

const fakeAudio = installFakeAudio()

/** mulberry32 */
export function seeded(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** every `n`-th answer is wrong (the third, the sixth, …) */
export function alternate(n: number): (view: View) => 'right' | 'wrong' {
  let k = 0
  return () => (++k % n === 0 ? 'wrong' : 'right')
}

/** each Hebrew screen at each stage 1-4 where the cycle holds it (drawing on) */
export const CASES: [ScreenId, number][] = ([1, 2, 3, 4] as const).flatMap((stage) =>
  cycleOf(stage, true).filter((s) => s !== 'tower').map((s) => [s, stage] as [ScreenId, number]))

const tick = (ms = 100) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

/** the tower's board is not mounted here: its visit ends at once (unless a test turns this off) */
let towerAuto = true
export function setTowerAuto(v: boolean) { towerAuto = v }
function autoTower(c: RunController) {
  const s = c.view.screen
  if (towerAuto && s?.screen === 'tower' && !c.view.paused) c.towerDone(s.wave + s.waves - 1)
}

/** @public used by the tests of later tasks, not yet by this file */
export async function until(c: RunController, pred: (v: View) => boolean, max = 60_000) {
  for (let t = 0; t < max && !pred(c.view); t += 50) { autoTower(c); await tick(50) }
  if (!pred(c.view)) throw new Error(`condition not met; phase=${c.view.phase} screen=${c.view.screen?.screen}`)
}

/** after a mistake he does the right move himself (the marked answer); an explanation still has next */
export function proceed(c: RunController) {
  autoTower(c)
  if (c.view.fixing) c.gesture({ type: 'pick', id: (c.view.screen as { reveal: { right: string } }).reveal.right })
  else if (c.view.needNext) c.next()
}

/**
 * does the fix and presses next through any explanation until the next answer phase
 * @public used by the tests of later tasks, not yet by this file
 */
export async function drain(c: RunController) {
  for (let i = 0; i < 400 && !(c.view.phase === 'answer' && !c.view.needNext) && !c.view.over; i++) {
    proceed(c)
    await tick(50)
  }
}

/** the book open, drawing on, the demos, dot introductions and hints seen: the sessions are plain rounds */
const SAVE = {
  bookOpen: true, settings: { ...DEFAULT_SETTINGS, drawing: true },
  demosSeen: ['demo-broom', 'demo-broom-letter', 'demo-cauldron', 'demo-ladder', 'demo-ghosts-letter', 'demo-ghosts-syllable', 'demo-doors', 'demo-draw', 'demo-spell'],
  dotIntrosSeen: ['bet', 'kaf', 'pe', 'shin'],
  hintsSeen: Object.fromEntries(['cauldron', 'ladder', 'ghosts'].flatMap((s) => [1, 2, 3, 4].map((n) => [`${s}:${n}`, 99]))),
}

/** the real Spell Quest store as the run tests leave it before a test (the sessions themselves run on a save in memory) */
export function resetRunStore() {
  useSpellQuestStore.getState().resetProgress()
  useSpellQuestStore.setState(SAVE)
}

export interface SessionLog {
  voice: string[]
  events: { e: string; screen?: string; target?: string }[]
  views: string[]
}

/** the ids of what a view offers; later tasks add their new view fields here and never change the old ones */
export function choiceIdsOf(v: View): string {
  const s = v.screen
  if (!s) return ''
  switch (s.screen) {
    case 'broom': return s.waves.map((w) => w.choices.map((x) => x.id).join(',')).join('|')
    case 'cauldron': return s.tiles ? `${s.boxes!.map((x) => x.id).join(',')}/${s.gap}:${s.tiles.map((x) => x.id).join(',')}` : `${s.letterId}:${s.orbs.join(',')}`
    case 'ladder': return `${s.built.map((x) => x.id).join(',')}|${s.plates.map((x) => x.id).join(',')}${s.at !== undefined ? `|${s.at}${s.grow ? `+${s.grow}` : ''}${s.marked ? '*' : ''}` : ''}`
    case 'ghosts': return s.signs.map((x) => x.id).join(',')
    // (English: the plate's words first, `a big duck=duck:…`)
    case 'doors': return `${s.plate ? `${s.plate.map((x) => x.id).join(' ')}=` : ''}${s.word.id}:${s.keys.map((k) => k.id).join(',')}`
    case 'draw': return `${s.word.id}:${s.letter}:${s.mode}`
    case 'crystal': return String(s.kind)
    case 'tower': return `${s.wave}/${s.waves}`
    // the boxes filled so far (`_`: empty) and the tiles
    case 'spell': return `${s.round.word}:${s.filled.map((x) => x ?? '_').join(',')}:${s.round.tiles.map((x) => x.unit).join(',')}`
  }
}

function pickId(v: View, right: boolean): string | null {
  const s = v.screen!
  if (s.screen === 'cauldron' && s.tiles) { const a = s.boxes![s.gap!]; return right ? a.id : s.tiles.find((x) => x.id !== a.id)?.id ?? null }
  if (s.screen === 'cauldron') return right ? s.target.mark! : s.orbs.find((m) => m !== s.target.mark) ?? null
  if (s.screen === 'doors') return right ? s.word.id : s.keys.find((k) => k.id !== s.word.id)?.id ?? null
  if (s.screen === 'ghosts') return right ? s.target.id : s.signs.find((x) => x.id !== s.target.id && x.nearMissOf !== s.target.id)?.id ?? null
  if (s.screen === 'ladder') { const a = ladderAnswerId(s); return right ? a : s.plates.find((x) => x.id !== a && x.nearMissOf !== a)?.id ?? null }
  return null
}

/** the lane of the head wave's right orb, or of a wrong one that is not a near miss */
function broomLane(v: View, right: boolean): 0 | 1 | 2 | null {
  const s = v.screen
  if (s?.screen !== 'broom') return null
  const head = s.waves.find((w) => w.resolved.some((r) => !r))
  if (!head) return null
  const j = head.choices.findIndex((x, k) => x.soundId === s.target.soundId && !head.resolved[k])
  if (right) return j < 0 ? null : (head.lanes?.[j] ?? j) as 0 | 1 | 2
  const w = head.choices.findIndex((x, k) => k !== j && !head.resolved[k] && x.nearMissOf !== s.target.id)
  return w < 0 ? null : (head.lanes?.[w] ?? w) as 0 | 1 | 2
}

const WRONG_STROKE: Pt[] = [[0.05, 0.9], [0.5, 0.95], [0.95, 0.9]]

/**
 * A seeded session on the fake clock and the in-memory save; `answer` says right or wrong once per round (per wave on
 * the broom, per letter on the drawing screens, where a wrong answer is one stray stroke first).
 */
export async function recordSession(opts: RunOpts, answer: (view: View) => 'right' | 'wrong'): Promise<SessionLog> {
  vi.useFakeTimers()
  setTowerAuto(true)
  resetRunStore()
  spellQuestTelemetry.clear()
  fakeAudio.reset()
  const voice: string[] = []
  fakeAudio.onVoice((id) => { voice.push(id); return new Promise((r) => setTimeout(r, 10)) })
  const stage = (opts.force?.stage ?? 1) as Stage
  const c = new RunController({
    now: () => Date.now(), save: memorySavePort({ ...SAVE, stage: { stage, newAnswers: '' } }), ...opts,
  })
  const views: string[] = []
  const note = () => {
    const v = c.view
    const line = `${v.screen?.screen ?? '-'}:${v.phase}:${choiceIdsOf(v)}`
    if (views[views.length - 1] !== line) views.push(line)
  }
  try {
    c.start()
    let armed = true
    let broomWave = -1
    let broomRight = true
    let drawKey = ''
    let skipWrong = false
    let spellKey = ''
    for (let guard = 0; guard < 20_000 && !c.view.over; guard++) {
      autoTower(c)
      note()
      const v = c.view
      const s = v.screen
      if (s?.screen === 'spell') {
        // one answer per box (a wrong one: a tile that is no box's, then he fixes it with the right one)
        const box = s.filled.findIndex((x) => x === null)
        const right = s.round.boxes[box]?.unit
        if (s.alive) spellKey = ''
        else if (right && !s.demo && !s.wrong && v.fixing) c.gesture({ type: 'drop', tile: right, box })
        else if (right && !s.demo && !s.wrong && v.phase === 'answer' && s.filled.join(',') + box !== spellKey) {
          spellKey = s.filled.join(',') + box
          const tile = answer(v) === 'right' ? right : s.round.tiles.find((t) => !s.round.boxes.some((b) => b.unit === t.unit))?.unit
          if (tile) c.gesture({ type: 'drop', tile, box })
        }
      } else if (v.needNext || v.fixing) { proceed(c); armed = false }
      else if (s?.screen === 'broom' && v.phase === 'answer') {
        const head = s.waves.find((w) => w.resolved.some((r) => !r))
        if (head && head.id !== broomWave) { broomWave = head.id; broomRight = answer(v) === 'right' }
        const lane = broomLane(v, broomRight)
        if (lane !== null) c.gesture({ type: 'lane', lane })
      } else if (s?.screen === 'draw' && v.phase === 'answer' && !s.demo) {
        const key = `${s.word.id}:${s.letter}`
        if (s.mode === 'letter' && s.strokes.length === 0 && key !== drawKey) { drawKey = key; skipWrong = answer(v) === 'right' }
        const letter = strokesOf(s.letter, s.script).variants[0].map((x) => resample(x.pts, 30))
        const done = s.strokes.filter((x) => x.state === 'ok' || x.state === 'helped').length
        const busy = s.strokes.some((x) => x.state === 'live' || x.state === 'pending')
        if (s.mode === 'letter' && !busy) {
          if (!skipWrong) { skipWrong = true; c.gesture({ type: 'stroke', pts: WRONG_STROKE }) }
          else if (done < letter.length && s.strokes.length === done) c.gesture({ type: 'stroke', pts: letter[done] })
        } else if (s.mode === 'mark' && !busy) {
          const ink = bbox(s.strokes.filter((x) => x.state === 'ok' || x.state === 'helped').flatMap((x) => x.pts))
          const marks = markTargets(s.marks, { letter: ink, vav: (s as DrawView).layout.vav?.box })
          const markStrokes = s.strokes.filter((x) => x.state === 'mark').length
          if (markStrokes < marks.length) c.gesture({ type: 'stroke', pts: marks[markStrokes] })
        }
      } else if (v.phase === 'answer' && s && s.screen !== 'crystal' && s.screen !== 'tower' && s.screen !== 'draw' && s.screen !== 'broom') {
        if (armed) {
          armed = false
          const id = pickId(v, answer(v) === 'right')
          // an unmarked English ladder rung: the plate is dropped on the place that changes
          const box = s.screen === 'ladder' && s.at !== undefined && !s.marked ? { box: s.at } : {}
          if (id) c.gesture({ type: 'pick', id, ...box })
        }
      }
      if (v.phase !== 'answer') armed = true
      await tick(50)
    }
    note()
    if (!c.view.over) throw new Error(`the session did not end; phase=${c.view.phase} screen=${c.view.screen?.screen}`)
  } finally {
    c.destroy()
    stopVoice()
    fakeAudio.onVoice(null)
    vi.useRealTimers()
  }
  const events = (spellQuestTelemetry.events() as { e: string; screen?: unknown; target?: unknown }[]).map((x) => ({
    e: x.e,
    ...(typeof x.screen === 'string' ? { screen: x.screen } : {}),
    ...(typeof x.target === 'string' ? { target: x.target } : {}),
  }))
  return { voice, events, views }
}
