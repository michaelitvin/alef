// Nikkud Wizard Duel — game flow. The reducer (utils/duel/reducer) owns the rules; this hook owns time:
// announcements, spoken instructions, clue-then-clock, the outcome's effects and speech, pause, and stats.
// Pacing rule: the next monster appears only after the effects AND every wizard line have finished (+500 ms).
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Choice, DuelMark, Next, PictureWord, Rng, Round } from '../types/duel'
import { duelReducer, initialDuelState } from '../utils/duel/reducer'
import { makeRound as defaultMakeRound, type MakeRoundOpts } from '../utils/duel/rounds'
import { MEGA_MAX, bossFor, isCorrect, isTwin, keyOf, newMonsterAt, pickEffect } from '../utils/duel/rules'
import { wordsFor } from '../utils/duel/words'
import type { LineCue } from '../assets/duel/lineCues'
import {
  configureDuelAudio, muteDuelAudio, playLine, playMusic, playSfx, stopAllLines, stopMusic, trackForWave, unlockDuelAudio,
} from '../utils/duel/duelAudio'
import { EFFECT_PRESETS } from '../components/duel/Explosion'
import type { IconName } from '../components/duel/Icon'
import { duelMusicOn, useProgressStore } from '../stores/progressStore'

/** What the announcement banner shows while the wizard speaks (rendered by DuelPage). */
export type BannerVisual = { icons: IconName[] } | { sprite: string }

const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

const HOW_ICON: Record<string, IconName> = { A: 'eye', B: 'ear', C: 'ear', D: 'shield', silent: 'ear' }

export interface UseDuelGameOpts {
  rng?: Rng
  /** verify/test builds only: fixed monster walk time */
  walkOverride?: number
  /** injectable round factory (tests) */
  makeRound?: (o: MakeRoundOpts) => Round
}

export function useDuelGame({ rng = Math.random, walkOverride, makeRound = defaultMakeRound }: UseDuelGameOpts = {}) {
  const [state, dispatch] = useReducer(duelReducer, initialDuelState)
  const [banner, setBanner] = useState<BannerVisual | null>(null)
  const [newBest, setNewBest] = useState(false)
  const [shake, setShake] = useState<{ power: number; at: number } | null>(null)
  /** What the wizard is naming right now ("the picture", "the marks"…): DuelPage makes it glow. */
  const [cue, setCue] = useState<LineCue | null>(null)
  /** The mega button shows only once the wizard says "tap the lightning" (בָּרָק). */
  const [lightning, setLightning] = useState(false)

  const stateRef = useRef(state)
  stateRef.current = state
  const pausedRef = useRef(false)
  const runId = useRef(0) // bumps on start/unmount: stale async continuations stop
  const roundToken = useRef(0) // bumps on every begin(): stale per-round continuations stop
  const nextId = useRef(1)
  const introDue = useRef(false)
  const spawnedAt = useRef(0)
  const walkStartedAt = useRef(0)
  const answeredRound = useRef(-1) // guards double taps between renders
  const twinRound = useRef(-1)
  const twinKey = useRef<string | null>(null)
  const almost = useRef<Promise<void>>(Promise.resolve()) // "almost" + twin name; the outcome speech waits for it
  const megaAnnounced = useRef(false)
  const megaQueued = useRef(false) // lightning tapped between monsters: cast on the next one
  const cueTimer = useRef(0)
  const pendingSpawn = useRef<Extract<Next, { kind: 'spawn' }> | null>(null)
  const resumeAdvance = useRef(false)
  const onCue = useCallback((c: LineCue) => {
    if (c === 'lightning') setLightning(true)
    setCue(c)
    window.clearTimeout(cueTimer.current)
    cueTimer.current = window.setTimeout(() => setCue(null), 1500)
  }, [])

  const store = useProgressStore

  /** Wizard feedback: name → sound → "כְּמוֹ <word>" (shva: name → the silent puff). */
  const sayMark = useCallback((m: DuelMark, word?: PictureWord) => {
    const w = word ?? wordsFor(m.group)[0]
    return playLine(`wiz-${m.id}`)
      .then(() => delay(250))
      .then(() => (m.group === 'silent' ? playLine('sfx-mute') : playLine(`wiz-vowel-${m.group}`)))
      .then(() => (m.group === 'silent' ? undefined : delay(200).then(() => playLine(`wiz-word-${w.key}`))))
  }, [])

  // Clues are said once, cleanly, by the narrator — the same verified lines as the feedback. (The monster voice
  // and its pitch-shifting were dropped after playtesting: they moaned.)
  const playClue = useCallback((r: Round) => {
    if (r.type === 'B') return r.target.group === 'silent' ? playLine('sfx-mute') : playLine(`wiz-vowel-${r.target.group}`)
    if (r.type === 'C') return playLine(`wiz-${r.target.id}`)
    if (r.type === 'A' && r.word.he) return playLine(`wiz-word-${r.word.key}`)
    return Promise.resolve()
  }, [])

  /** Show the monster; A/D walk at once, B/C after arrival sound → silence → clue. */
  const begin = useCallback(
    (r: Round) => {
      const token = ++roundToken.current
      almost.current = Promise.resolve()
      dispatch({ type: 'ROUND_READY', round: r })
      spawnedAt.current = performance.now()
      walkStartedAt.current = performance.now()
      playMusic(trackForWave(stateRef.current.wave, r.boss))
      const arrived = playSfx('arrival')
      if (r.type === 'A' || r.type === 'D') return
      void arrived
        .then(() => delay(450))
        .then(() => (token === roundToken.current && !pausedRef.current ? playClue(r) : undefined))
        .then(() => {
          if (token !== roundToken.current || pausedRef.current) return
          walkStartedAt.current = performance.now()
          dispatch({ type: 'WALK_START' })
        })
    },
    [playClue],
  )

  /** Announcement (if any) → new round → first-time instruction (if any) → begin. Holds while paused. */
  const spawn = useCallback(
    async (next: Extract<Next, { kind: 'spawn' }>) => {
      const run = runId.current
      const held = () => run !== runId.current || pausedRef.current
      if (pausedRef.current) return void (pendingSpawn.current = next)

      if (introDue.current) {
        // no banner: the wizard on the tower is the one speaking (a second wizard picture doubled him)
        await playLine('line-intro', onCue)
        if (run !== runId.current) return
        introDue.current = false
        if (held()) return void (pendingSpawn.current = next)
      }
      if (next.announce) {
        const visual: BannerVisual =
          next.announce === 'boss' ? { sprite: bossFor(next.wave) }
          : next.announce === 'new-monster' ? { sprite: newMonsterAt(next.wave) ?? 'fuzzy' }
          : { icons: ['swords'] }
        setBanner(visual)
        await playLine(`line-${next.announce}`)
        setBanner(null)
        if (held()) return void (pendingSpawn.current = next)
      }

      const s = stateRef.current
      const lifetime: Record<string, number> = {}
      for (const [id, t] of Object.entries(store.getState().duel.byMark)) lifetime[id] = t.wrong + t.timeout
      const r = makeRound({ id: nextId.current++, wave: next.wave, kills: s.kills, boss: next.boss, rng, runMisses: s.runMisses, lifetimeMisses: lifetime })
      if (walkOverride) r.walkMs = walkOverride

      const key = r.type === 'B' && r.target.group === 'silent' ? 'silent' : r.type
      if (!s.seenScreens.includes(key)) {
        setBanner({ icons: [HOW_ICON[key]] })
        await playLine(`line-how-${key}`, onCue)
        setBanner(null)
        if (held()) return void (pendingSpawn.current = { ...next, announce: null })
        dispatch({ type: 'SCREEN_EXPLAINED', key })
      }
      begin(r)
    },
    [begin, makeRound, rng, store, walkOverride],
  )

  // React to the reducer asking for the next step.
  useEffect(() => {
    const next = state.next
    if (!next) return
    if (next.kind === 'spawn') {
      void spawn(next)
      return
    }
    // run over
    const best = store.getState().duel.bestScore
    const isBest = state.score > best
    store.getState().recordDuelRunEnd(state.score, state.wave)
    setNewBest(isBest)
    playMusic('victory')
    void playLine('line-over').then(() => (isBest ? playLine('line-record') : undefined))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.next])

  // The clock: a walking monster that reaches the tower is a miss.
  useEffect(() => {
    const r = state.round
    if (!r || !state.walking || state.paused || state.outcome || state.phase !== 'playing') return
    const left = r.walkMs - (performance.now() - walkStartedAt.current)
    const t = window.setTimeout(() => dispatch({ type: 'TIMEOUT' }), Math.max(0, left))
    return () => clearTimeout(t)
  }, [state.round, state.walking, state.paused, state.outcome, state.phase])

  // An outcome: record it, play effects and the wizard's lines, then advance.
  useEffect(() => {
    const o = state.outcome
    const r = state.round
    if (!o || !r || state.phase !== 'playing') return
    const token = roundToken.current
    const result = o.mega ? 'mega' : o.kind === 'hit' ? 'correct' : o.choiceKey ? 'wrong' : 'timeout'
    store.getState().recordDuelRound(r.target.id, r.type, result, performance.now() - spawnedAt.current)

    const juice = EFFECT_PRESETS[o.effect]
    let wait: number
    if (o.kind === 'hit') {
      const impact = 260 + juice.hitstopMs
      void playSfx(o.mega ? 'mega' : 'cast')
      window.setTimeout(() => {
        void playSfx('boom', o.final ? juice.boom : juice.boom * 0.5)
        void playSfx('sparkle')
        setShake({ power: o.final ? juice.shake : juice.shake * 0.4, at: Date.now() })
      }, impact)
      wait = 1300 + juice.hitstopMs
    } else {
      window.setTimeout(() => {
        void playSfx('ouch')
        setShake({ power: 8, at: Date.now() })
      }, 380)
      wait = 2000
    }
    if (o.mega) megaAnnounced.current = false
    const comboLine = o.kind === 'hit' && state.combo > 0 && state.combo % 5 === 0
    const megaLine = o.kind === 'hit' && !o.mega && state.mega >= MEGA_MAX && !megaAnnounced.current
    if (megaLine) megaAnnounced.current = true

    const speech = Promise.all([almost.current, delay(o.kind === 'hit' ? 560 + juice.hitstopMs : 700)])
      .then(() => sayMark(r.target, r.word))
      .then(() => (comboLine ? playLine('line-combo') : undefined))
      .then(() => (megaLine ? playLine('line-mega', onCue) : undefined))
    void Promise.all([delay(wait), speech])
      .then(() => delay(500))
      .then(() => {
        if (token !== roundToken.current) return
        if (pausedRef.current) {
          resumeAdvance.current = true
          return
        }
        dispatch({ type: 'ADVANCE' })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.outcome])

  const start = useCallback(() => {
    unlockDuelAudio()
    muteDuelAudio(false) // a run left while paused must not leave everything muted
    const { settings } = store.getState()
    configureDuelAudio({ sfx: settings.soundEffects, music: duelMusicOn(settings), volume: settings.volume })
    store.getState().recordDuelSession()
    runId.current += 1
    roundToken.current += 1
    pausedRef.current = false
    pendingSpawn.current = null
    resumeAdvance.current = false
    introDue.current = true
    megaAnnounced.current = false
    megaQueued.current = false
    setLightning(false)
    setCue(null)
    setNewBest(false)
    setBanner(null)
    dispatch({ type: 'START' })
  }, [store])

  const choose = useCallback((c: Choice) => {
    const s = stateRef.current
    const r = s.round
    if (!r || s.outcome || s.paused || s.phase !== 'playing' || answeredRound.current === r.id) return
    if (twinRound.current === r.id && keyOf(c) === twinKey.current) return // same twin again: still forgiven
    if (!isCorrect(r, c) && isTwin(r, c) && !s.twinTried && twinRound.current !== r.id) {
      // forgiven once: no heart, no combo break — hear which mark he tapped, then try again
      twinRound.current = r.id
      twinKey.current = keyOf(c)
      store.getState().recordDuelTwin(r.target.id, r.type)
      if (c.kind === 'rune') almost.current = playLine('line-almost').then(() => playLine(`wiz-${c.mark.id}`))
      dispatch({ type: 'CHOOSE', choice: c, effect: 'gentle' })
      return
    }
    answeredRound.current = r.id
    const effect = pickEffect(rng, { final: !r.boss || s.bossHp <= 1, mega: false, boss: r.boss })
    dispatch({ type: 'CHOOSE', choice: c, effect })
  }, [rng, store])

  const megaCast = useCallback(() => {
    const s = stateRef.current
    const r = s.round
    if (s.paused || s.mega < MEGA_MAX) return
    if (!r || s.outcome) {
      megaQueued.current = true // he did what the wizard said; it fires when the next monster appears
      return
    }
    if (answeredRound.current === r.id) return
    megaQueued.current = false
    answeredRound.current = r.id
    dispatch({ type: 'MEGA', effect: 'mega' })
  }, [])

  const pause = useCallback(() => {
    const s = stateRef.current
    if (s.phase !== 'playing' || pausedRef.current) return
    pausedRef.current = true
    dispatch({ type: 'PAUSE' })
    muteDuelAudio(true)
    stopAllLines()
  }, [])

  const resume = useCallback(() => {
    if (!pausedRef.current) return
    pausedRef.current = false
    unlockDuelAudio() // inside the ▶ tap: Android may have suspended audio during a long lock
    dispatch({ type: 'RESUME' })
    muteDuelAudio(false)
    const s = stateRef.current
    if (pendingSpawn.current) {
      const p = pendingSpawn.current
      pendingSpawn.current = null
      void spawn(p)
    } else if (resumeAdvance.current) {
      resumeAdvance.current = false
      dispatch({ type: 'ADVANCE' })
    } else if (s.round && !s.outcome) {
      // restart the interrupted round from the right edge, clue and all
      begin({ ...s.round, id: nextId.current++ })
    }
  }, [begin, spawn])

  const replayClue = useCallback(() => {
    const r = stateRef.current.round
    if (r) void playClue(r)
  }, [playClue])

  // Tablet locked / tab hidden → pause.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [pause])

  // Leaving the page stops everything.
  useEffect(
    () => () => {
      runId.current += 1
      roundToken.current += 1
      pausedRef.current = false
      stopMusic()
      stopAllLines()
      muteDuelAudio(false) // leaving while paused must not leave the app muted
    },
    [],
  )

  // A lightning tap queued between monsters fires as soon as the next one is on the field.
  useEffect(() => {
    if (megaQueued.current && state.round && !state.outcome && !state.paused) megaCast()
  }, [state.round, state.outcome, state.paused, megaCast])
  useEffect(() => {
    if (state.mega < MEGA_MAX) {
      setLightning(false)
      megaQueued.current = false
    }
  }, [state.mega])
  useEffect(() => () => window.clearTimeout(cueTimer.current), [])

  return { state, banner, newBest, shake, cue, lightning, start, choose, megaCast, pause, resume, replayClue, sayMark }
}
