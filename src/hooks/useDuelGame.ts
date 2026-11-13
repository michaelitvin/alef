// Nikkud Wizard Duel — game flow. The reducer (utils/duel/reducer) owns the rules; this hook owns time:
// announcements, spoken instructions, clue-then-clock, the outcome's effects and speech, pause, and stats.
// Pacing rule: the next monster appears only after the effects AND every wizard line have finished (+500 ms).
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { Choice, DuelMark, Next, PictureWord, Rng, Round } from '../types/duel'
import { duelReducer, initialDuelState } from '../utils/duel/reducer'
import { makeRound as defaultMakeRound, type MakeRoundOpts } from '../utils/duel/rounds'
import { MEGA_MAX, bossFor, isCorrect, isTwin, keyOf, newMonsterAt, nextPace, pickEffect, unlockedMonsters } from '../utils/duel/rules'
import { wordsFor } from '../utils/duel/words'
import { LINE_CUES, type LineCue } from '../assets/duel/lineCues'
import { MONSTERS, WORD_PICTURE } from '../assets/duel/sprites'
import { flushTelemetry, setTelemetryRun, track } from '../utils/duel/telemetry'
import { feedbackPlan, nextBossStart, type FeedbackPlan } from '../utils/duel/flow'
import { predictedMistakeRate } from '../utils/duel/rounds'
import { makeFxPicker, type FxStyle } from '../utils/duel/fxStyle'
import {
  configureDuelAudio, muteDuelAudio, playLine, playMusic, playSfx, stopAllLines, stopMusic, trackForWave, unlockDuelAudio,
  lineAsset,
} from '../utils/duel/duelAudio'
import { EFFECT_PRESETS } from '../components/duel/Explosion'
import type { IconName } from '../components/duel/Icon'
import { duelMusicOn, useProgressStore } from '../stores/progressStore'

/** What the announcement banner shows while the wizard speaks (rendered by DuelPage). */
export type BannerVisual = { icons: IconName[] } | { sprite: string }

const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
/** Playtest: lines ran into each other (intro → instruction); a beat of silence between consecutive lines. */
const LINE_GAP_MS = 800


/**
 * Book 2's run plays the duel as one of its screens (spec: one duel, Part 3): no מגה, the run owns the hearts (each answer
 * is reported), a fixed visit of `waves` waves from `wave` (or one boss), no session or run-end records (the rounds,
 * confusions and pace are still recorded: the adaptive data), no duel music, and no own visibility pause (the run pauses
 * it through pause()/resume()). The intro and the screen explanations play once ever: `seen` / `onSeen` keep them
 * (keys 'tower-intro' and 'tower-screen-<key>').
 */
export interface DuelEmbedded {
  wave: number
  waves: number
  boss: boolean
  seen: string[]
  onSeen: (key: string) => void
  /** a hit → 'right'; a miss or a timeout → 'wrong' (the forgiven twin is not an answer); 'over' stops after its feedback */
  onAnswer: (r: 'right' | 'wrong', markId: string) => 'on' | 'over'
  /** the visit is over (its waves, the boss's defeat, or the run's hearts ran out): the last wave played */
  onDone: (lastWave: number) => void
  /** the duel's sound effects and volume follow the run's settings */
  audio?: { sfx: boolean; volume: number }
  /** the gallery: nothing is recorded */
  dry?: boolean
  /**
   * monsters whose introduction a boss visit skipped (rules.skippedMonsters): each is introduced at the start of a wave
   * that has no new monster of its own, and never appears before that; `onIntroduced` is told once its line was said
   */
  owed?: string[]
  onIntroduced?: (id: string) => void
  /** the placement check (Book 2's stage 0): every mark with no recent answer is asked first (pickTarget's cover) */
  placement?: boolean
  /**
   * a wave of the visit ended and another one would start: true ends the visit there (onDone with that wave), e.g. when
   * stage 0 has passed in the middle of a visit
   */
  onWaveEnd?: (wave: number) => boolean
}

export interface UseDuelGameOpts {
  rng?: Rng
  /** verify/test builds only: fixed monster walk time */
  walkOverride?: number
  /** injectable round factory (tests) */
  makeRound?: (o: MakeRoundOpts) => Round
  embedded?: DuelEmbedded
}

export const TOWER_INTRO = 'tower-intro'
export const towerScreenKey = (key: string) => `tower-screen-${key}`

export function useDuelGame({ rng = Math.random, walkOverride, makeRound = defaultMakeRound, embedded }: UseDuelGameOpts = {}) {
  /** the current embedded callbacks (the options object is new on every render) */
  const emb = useRef(embedded)
  emb.current = embedded
  /** embedded: the run's hearts ran out; nothing spawns after this round's feedback */
  const overRef = useRef(false)
  const doneRef = useRef(false)
  const [state, dispatch] = useReducer(duelReducer, initialDuelState)
  const [banner, setBanner] = useState<BannerVisual | null>(null)
  const [newBest, setNewBest] = useState(false)
  const [shake, setShake] = useState<{ power: number; at: number } | null>(null)
  /** What the wizard is naming right now ("the picture", "the marks"…): DuelPage makes it glow. */
  const [cue, setCue] = useState<LineCue | null>(null)
  /** The mega button shows only once the wizard says "tap the lightning" (בָּרָק). */
  const [lightning, setLightning] = useState(false)
  /** A streak being celebrated (every 5 hits in a row): DuelPage shows the burst. */
  const [celebrate, setCelebrate] = useState<{ combo: number; at: number } | null>(null)
  /** Which part of the result the wizard is saying now: the banner animates it. */
  const [speaking, setSpeaking] = useState<'sound' | 'name' | 'word' | null>(null)
  /** Things not on screen yet: each appears when the wizard names it ("…the tower", "…the picture", "…the marks"). */
  const [hidden, setHidden] = useState<LineCue[]>([])
  /** The look of the current hit (projectile, burst, exit, colours, cast), dealt so hits don't repeat. */
  const [fx, setFx] = useState<FxStyle | null>(null)
  /** How the current result is fed back (full recap / sound + name / sound only); DuelPage shows the banner from it. */
  const [feedback, setFeedback] = useState<FeedbackPlan | null>(null)
  const nextFx = useRef<(() => FxStyle) | null>(null)

  const stateRef = useRef(state)
  stateRef.current = state
  const pausedRef = useRef(false)
  const runId = useRef(0) // bumps on start/unmount: stale async continuations stop
  const roundToken = useRef(0) // bumps on every begin(): stale per-round continuations stop
  const nextId = useRef(1)
  const introDue = useRef(false)
  /** the last wave whose start was handled (an owed monster's introduction comes at a wave's start) */
  const waveStart = useRef(-1)
  /** owed monsters introduced in this visit */
  const introduced = useRef(new Set<string>())
  /** the owed monster introduced at this wave's start: the wave's first monster */
  const owedNow = useRef<{ wave: number; id: string } | null>(null)
  const spawnedAt = useRef(0)
  const walkStartedAt = useRef(0)
  const answeredRound = useRef(-1) // guards double taps between renders
  const twinRound = useRef(-1)
  const twinKey = useRef<string | null>(null)
  const almost = useRef<Promise<void>>(Promise.resolve()) // "almost" + twin name; the outcome speech waits for it
  const megaAnnounced = useRef(false)
  const marksThisRun = useRef(new Set<string>()) // marks already answered this game (the first time gets the full recap)
  const bossStart = useRef(0) // a boss fight continues from where the boss stood
  const megaQueued = useRef(false) // lightning tapped between monsters: cast on the next one
  const cueTimer = useRef(0)
  const pendingSpawn = useRef<Extract<Next, { kind: 'spawn' }> | null>(null)
  const resumeAdvance = useRef(false)
  const onCue = useCallback((c: LineCue) => {
    if (c === 'lightning') setLightning(true)
    setHidden((h) => (h.includes(c) ? h.filter((x) => x !== c) : h))
    setCue(c)
    window.clearTimeout(cueTimer.current)
    cueTimer.current = window.setTimeout(() => setCue(null), 1500)
  }, [])

  const store = useProgressStore
  /** Every voice line goes through here so telemetry knows exactly which asset played. */
  const say = useCallback((id: string, cb?: (c: LineCue) => void) => {
    track('line', lineAsset(id))
    return playLine(id, cb)
  }, [])

  /**
   * Wizard feedback: sound → name → picture word (shva: the silent puff → name), each highlighted as it is said.
   * `parts` shortens it after confident answers: 'sound-name' drops the word, 'sound' says only the sound.
   */
  const sayMark = useCallback((m: DuelMark, word?: PictureWord, parts: FeedbackPlan['say'] = 'full') => {
    const w = word ?? wordsFor(m.group)[0]
    setSpeaking('sound')
    return (m.group === 'silent' ? say('sfx-mute') : say(`wiz-vowel-${m.group}`))
      .then(() => (parts === 'sound' ? undefined : delay(250).then(() => {
        setSpeaking('name')
        return say(`wiz-${m.id}`)
      })))
      .then(() => {
        if (m.group === 'silent' || parts !== 'full') return undefined
        return delay(200).then(() => {
          setSpeaking('word')
          return say(`wiz-word-${w.key}`)
        })
      })
      .finally(() => setSpeaking(null))
  }, [say])

  // Clues are said once, cleanly, by the narrator — the same verified lines as the feedback. (The monster voice
  // and its pitch-shifting were dropped after playtesting: they moaned.)
  const playClue = useCallback((r: Round) => {
    if (r.type === 'B') return r.target.group === 'silent' ? say('sfx-mute') : say(`wiz-vowel-${r.target.group}`)
    if (r.type === 'C') return say(`wiz-${r.target.id}`)
    if (r.type === 'A' && r.word.he) return say(`wiz-word-${r.word.key}`)
    return Promise.resolve()
  }, [])

  /** Show the monster; A/D walk at once, B/C after arrival sound → silence → clue. */
  const begin = useCallback(
    (r: Round, restart = false) => {
      const token = ++roundToken.current
      almost.current = Promise.resolve()
      dispatch({ type: 'ROUND_READY', round: r })
      spawnedAt.current = performance.now()
      walkStartedAt.current = performance.now()
      const s = stateRef.current
      track('round', {
        round: r.id, restart, wave: s.wave, kills: s.kills, boss: r.boss, bossHp: s.bossHp, hearts: s.hearts,
        combo: s.combo, type: r.type, target: r.target.id, word: r.word.key, picture: r.type === 'A' ? WORD_PICTURE[r.word.key] : null,
        monster: r.monster, monsterSrc: MONSTERS[r.monster]?.src ?? null, walkMs: r.walkMs,
        pad: r.runes.map((m) => m.id), padWords: r.padWords.map((w) => w.key),
      })
      if (!emb.current) playMusic(trackForWave(stateRef.current.wave, r.boss), stateRef.current.wave)
      if (r.boss && !r.startFrac) {
        // a boss stomps in: the ground shakes
        window.setTimeout(() => {
          setShake({ power: 9, at: Date.now() })
          void playSfx('boom', 0.5)
        }, 280)
      }
      const arrived = r.startFrac ? Promise.resolve() : playSfx('arrival')
      if (r.type === 'A' || r.type === 'D') return
      void arrived
        .then(() => delay(450))
        .then(() => (token === roundToken.current && !pausedRef.current ? playClue(r) : undefined))
        .then(() => {
          if (token !== roundToken.current || pausedRef.current) return
          walkStartedAt.current = performance.now()
          track('walk', { round: r.id, clueMs: Math.round(walkStartedAt.current - spawnedAt.current) })
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
        await say('line-intro', onCue)
        setHidden([])
        await delay(LINE_GAP_MS)
        if (run !== runId.current) return
        introDue.current = false
        emb.current?.onSeen(TOWER_INTRO)
        if (held()) return void (pendingSpawn.current = next)
      }
      // embedded: a monster whose introduction a boss visit skipped is introduced at the start of a wave with no new
      // monster of its own
      const pendingOwed = () => (emb.current?.owed ?? []).filter((id) => !introduced.current.has(id))
      let owed: string | null = null
      if (emb.current && !next.boss && waveStart.current !== next.wave && !newMonsterAt(next.wave)) {
        owed = pendingOwed().find((id) => unlockedMonsters(next.wave).includes(id)) ?? null
      }
      const announce = owed ? 'new-monster' : next.announce
      if (announce) {
        const visual: BannerVisual =
          announce === 'boss' ? { sprite: bossFor(next.wave) }
          : announce === 'new-monster' ? { sprite: owed ?? newMonsterAt(next.wave) ?? 'fuzzy' }
          : { icons: ['swords'] }
        setBanner(visual)
        track('announce', { kind: announce, wave: next.wave, ...(owed ? { owed } : {}) })
        await say(`line-${announce}`)
        setBanner(null)
        // a pause during the line says it again after the resume (as for any announcement)
        if (held()) return void (pendingSpawn.current = next)
        waveStart.current = next.wave
        if (owed) {
          introduced.current.add(owed)
          owedNow.current = { wave: next.wave, id: owed }
          emb.current?.onIntroduced?.(owed)
        }
        await delay(LINE_GAP_MS)
        if (held()) return void (pendingSpawn.current = owed ? { ...next, announce: null } : next)
      }
      waveStart.current = next.wave

      const s = stateRef.current
      const { byMark, confusions, recent } = store.getState().duel
      const r = makeRound({
        id: nextId.current++, wave: next.wave, kills: s.kills, boss: next.boss, rng,
        lifetime: byMark, recent: recent ?? {}, confusions: confusions ?? {},
        bossStart: next.boss ? bossStart.current : undefined, cover: !!emb.current?.placement,
      })
      if (!r.boss && emb.current) {
        const now = owedNow.current
        if (now && now.wave === next.wave) {
          // right after its "new monster!" comes that monster
          r.monster = now.id
          owedNow.current = null
        } else if (pendingOwed().includes(r.monster)) {
          // an owed monster never appears before its introduction
          const others = unlockedMonsters(next.wave).filter((id) => !pendingOwed().includes(id))
          r.monster = others[Math.floor(rng() * others.length) % Math.max(1, others.length)] ?? r.monster
        }
      }
      // adaptive pace, applied silently between monsters (a ?walk= override in test builds wins)
      r.walkMs = walkOverride ?? Math.round(r.walkMs * (store.getState().duel.pace ?? 1))

      const key = r.type === 'B' && r.target.group === 'silent' ? 'silent' : r.type
      if (!s.seenScreens.includes(key)) {
        // no look/listen icon (playtest: not needed); the glow cues point at the picture, speaker and marks
        // the round is shown while it is explained; its parts appear as the wizard names them
        setHidden((LINE_CUES[`line-how-${key}`] ?? []).map((c) => c.cue))
        dispatch({ type: 'ROUND_PREVIEW', round: r })
        await say(`line-how-${key}`, onCue)
        setHidden([])
        setBanner(null)
        if (held()) return void (pendingSpawn.current = { ...next, announce: null })
        dispatch({ type: 'SCREEN_EXPLAINED', key })
        emb.current?.onSeen(towerScreenKey(key))
      }
      begin(r)
    },
    [begin, makeRound, rng, store, walkOverride],
  )

  // React to the reducer asking for the next step.
  useEffect(() => {
    const next = state.next
    if (!next) return
    const e = emb.current
    if (e) {
      // a visit of Book 2's run: its waves are done (or its boss is beaten): no next monster
      if (next.kind === 'spawn' && next.wave >= e.wave + (e.boss ? 1 : e.waves)) {
        if (!doneRef.current) { doneRef.current = true; e.onDone(next.wave - 1) }
        return
      }
      // a wave ended in the middle of the visit: the run may end the visit here
      if (next.kind === 'spawn' && waveStart.current >= 0 && next.wave > waveStart.current && e.onWaveEnd?.(next.wave - 1)) {
        if (!doneRef.current) { doneRef.current = true; e.onDone(next.wave - 1) }
        return
      }
      if (next.kind === 'over') return
    }
    if (next.kind === 'spawn') {
      void spawn(next)
      return
    }
    // run over
    const best = store.getState().duel.bestScore
    const isBest = state.score > best
    store.getState().recordDuelRunEnd(state.score, state.wave)
    track('run_end', { reason: 'hearts', score: state.score, wave: state.wave, bestCombo: state.bestCombo, newBest: isBest })
    flushTelemetry()
    setNewBest(isBest)
    playMusic('victory')
    void say('line-over').then(() => (isBest ? say('line-record') : undefined))
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
    // how sure the answer was — measured before this round is recorded
    const before = store.getState().duel
    const confidence = {
      firstThisRun: !marksThisRun.current.has(r.target.id),
      predicted: predictedMistakeRate(before.byMark[r.target.id], before.recent?.[r.target.id]),
      usedFrac: state.walking ? (performance.now() - walkStartedAt.current) / r.walkMs : null,
      twin: state.twinTried !== null,
    }
    marksThisRun.current.add(r.target.id)
    const dry = !!emb.current?.dry
    if (!dry) store.getState().recordDuelRound(r.target.id, r.type, result, performance.now() - spawnedAt.current)
    // Book 2's run owns the hearts, the stars and the coins: each answer goes to it
    if (emb.current && emb.current.onAnswer(o.kind === 'hit' ? 'right' : 'wrong', r.target.id) === 'over') overRef.current = true
    const now = performance.now()
    const msWalk = state.walking || result === 'timeout' ? now - walkStartedAt.current : null
    const pace = nextPace(store.getState().duel.pace ?? 1, { result, msWalk, walkMs: r.walkMs })
    if (r.boss) bossStart.current = o.final ? 0 : nextBossStart(r.startFrac ?? 0, msWalk, r.walkMs, result)
    const plan = feedbackPlan(r, o, confidence)
    setFeedback(plan)
    if (!dry) store.getState().setDuelPace(pace)
    track('outcome', {
      pace, feedback: plan.say, predicted: Math.round(confidence.predicted * 1000) / 1000,
      round: r.id, result, choice: o.choiceKey, mega: o.mega, final: o.final, points: o.points, effect: o.effect,
      hearts: state.hearts, combo: state.combo, score: state.score, bossHp: state.bossHp,
      msShown: Math.round(now - spawnedAt.current), msWalk: Math.round(now - walkStartedAt.current),
    })

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
      wait = plan.waitMs
    } else {
      window.setTimeout(() => {
        void playSfx('ouch')
        setShake({ power: 8, at: Date.now() })
      }, 380)
      wait = plan.waitMs
    }
    if (o.mega) megaAnnounced.current = false
    const comboLine = o.kind === 'hit' && state.combo > 0 && state.combo % 5 === 0
    if (comboLine) track('combo', { round: r.id, combo: state.combo })
    const megaLine = !emb.current && o.kind === 'hit' && !o.mega && state.mega >= MEGA_MAX && !megaAnnounced.current
    if (megaLine) megaAnnounced.current = true

    const speech = Promise.all([almost.current, delay(o.kind === 'hit' ? 560 + juice.hitstopMs : 700)])
      // a defeated boss is congratulated first (music pauses for it), then the usual recap
      .then(() => (r.boss && o.kind === 'hit' && o.final ? say('line-boss-win') : undefined))
      .then(() => sayMark(r.target, r.word, plan.say))
      .then(() => {
        if (!comboLine) return
        setCelebrate({ combo: state.combo, at: Date.now() })
        void playSfx('sparkle')
        return say('line-combo').then(() => setCelebrate(null))
      })
      .then(() => (megaLine ? say('line-mega', onCue) : undefined))
    void Promise.all([delay(wait), speech])
      .then(() => delay(plan.tailMs))
      .then(() => {
        if (token !== roundToken.current) return
        if (overRef.current) {
          // the run's hearts ran out: the answer on the screen has finished; the run ends now
          if (!doneRef.current) { doneRef.current = true; emb.current?.onDone(stateRef.current.wave) }
          return
        }
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
    const e = emb.current
    const { settings } = store.getState()
    if (e) configureDuelAudio({ sfx: e.audio?.sfx ?? true, music: false, volume: e.audio?.volume ?? settings.volume })
    else configureDuelAudio({ sfx: settings.soundEffects, music: duelMusicOn(settings), volume: settings.volume })
    if (!e) store.getState().recordDuelSession()
    runId.current += 1
    setTelemetryRun(runId.current)
    track('run_start', e ? { embedded: true, wave: e.wave, waves: e.waves, boss: e.boss } : { music: duelMusicOn(settings), sfx: settings.soundEffects, volume: settings.volume })
    overRef.current = false
    doneRef.current = false
    roundToken.current += 1
    pausedRef.current = false
    pendingSpawn.current = null
    resumeAdvance.current = false
    introDue.current = !e || !e.seen.includes(TOWER_INTRO)
    waveStart.current = -1
    introduced.current = new Set()
    owedNow.current = null
    megaAnnounced.current = false
    megaQueued.current = false
    bossStart.current = 0
    marksThisRun.current = new Set()
    setLightning(false)
    setCue(null)
    setCelebrate(null)
    setHidden(introDue.current ? ['tower'] : []) // the intro names it: "…הַגֵּן עַל הַמִּגְדָּל"
    setNewBest(false)
    setBanner(null)
    if (e) {
      const seen = e.seen.filter((k) => k.startsWith(towerScreenKey(''))).map((k) => k.slice(towerScreenKey('').length))
      dispatch({ type: 'START_AT', wave: e.wave, boss: e.boss, seen })
    } else dispatch({ type: 'START' })
  }, [store])

  const choose = useCallback((c: Choice) => {
    const s = stateRef.current
    const r = s.round
    if (!r || s.outcome || s.paused || s.preview || s.phase !== 'playing' || answeredRound.current === r.id) return
    if (twinRound.current === r.id && keyOf(c) === twinKey.current) return // same twin again: still forgiven
    const now = performance.now()
    const pos = c.kind === 'rune' ? r.runes.findIndex((m) => m.id === c.mark.id) : r.padWords.findIndex((w) => w.group === c.group)
    track('choice', {
      round: r.id, key: keyOf(c), pos, correct: isCorrect(r, c), twin: !isCorrect(r, c) && isTwin(r, c), walking: s.walking,
      msShown: Math.round(now - spawnedAt.current), msWalk: s.walking ? Math.round(now - walkStartedAt.current) : null,
    })
    if (!isCorrect(r, c) && isTwin(r, c) && !s.twinTried && twinRound.current !== r.id) {
      // forgiven once: no heart, no combo break — hear which mark he tapped, then try again
      twinRound.current = r.id
      twinKey.current = keyOf(c)
      if (!emb.current?.dry) {
        store.getState().recordDuelTwin(r.target.id, r.type)
        store.getState().recordDuelConfusion(r.target.id, keyOf(c))
      }
      if (c.kind === 'rune') almost.current = say('line-almost').then(() => say(`wiz-${c.mark.id}`))
      dispatch({ type: 'CHOOSE', choice: c, effect: 'gentle' })
      return
    }
    answeredRound.current = r.id
    if (!isCorrect(r, c) && !emb.current?.dry) store.getState().recordDuelConfusion(r.target.id, keyOf(c))
    setFx((nextFx.current ??= makeFxPicker(rng))())
    const effect = pickEffect(rng, { final: !r.boss || s.bossHp <= 1, mega: false, boss: r.boss })
    dispatch({ type: 'CHOOSE', choice: c, effect })
  }, [rng, store])

  const megaCast = useCallback(() => {
    const s = stateRef.current
    const r = s.round
    if (emb.current || s.paused || s.mega < MEGA_MAX) return
    track('mega_tap', { round: r?.id ?? null, queued: !r || !!s.outcome })
    if (!r || s.outcome || s.preview) {
      megaQueued.current = true // he did what the wizard said; it fires when the next monster appears
      return
    }
    if (answeredRound.current === r.id) return
    megaQueued.current = false
    answeredRound.current = r.id
    setFx((nextFx.current ??= makeFxPicker(Math.random))())
    dispatch({ type: 'MEGA', effect: 'mega' })
  }, [])

  const pause = useCallback(() => {
    const s = stateRef.current
    if (s.phase !== 'playing' || pausedRef.current) return
    pausedRef.current = true
    track('pause', { cause: document.hidden ? 'hidden' : 'button', round: s.round?.id ?? null, duringOutcome: !!s.outcome })
    flushTelemetry()
    dispatch({ type: 'PAUSE' })
    muteDuelAudio(true)
    stopAllLines()
  }, [])

  const resume = useCallback(() => {
    if (!pausedRef.current) return
    pausedRef.current = false
    unlockDuelAudio() // inside the ▶ tap: Android may have suspended audio during a long lock
    track('resume', {})
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
      begin({ ...s.round, id: nextId.current++ }, true)
    }
  }, [begin, spawn])

  const replayClue = useCallback(() => {
    const r = stateRef.current.round
    if (r) track('replay', { round: r.id })
    if (r) void playClue(r)
  }, [playClue])

  // The tab closed or navigated away mid-run (no unmount happens then): record the churn.
  useEffect(() => {
    const onHide = () => {
      const s = stateRef.current
      if (s.phase !== 'playing') return
      track('abandon', {
        reason: 'pagehide', round: s.round?.id ?? null, wave: s.wave, score: s.score, hearts: s.hearts, paused: s.paused,
        duringOutcome: !!s.outcome, msShown: s.round ? Math.round(performance.now() - spawnedAt.current) : null,
      })
      flushTelemetry()
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])

  // Tablet locked / tab hidden → pause.
  useEffect(() => {
    const onVis = () => {
      // in Book 2's run the run pauses it (its own cover holds; no second cover)
      if (document.hidden && !emb.current) pause()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [pause])

  // Leaving the page stops everything.
  useEffect(
    () => () => {
      const s = stateRef.current
      // (a visit of Book 2's run that is done is no abandon)
      if (s.phase === 'playing' && !doneRef.current) {
        // left mid-run (home button, back): churn
        track('abandon', {
          reason: 'unmount',
          round: s.round?.id ?? null, wave: s.wave, score: s.score, hearts: s.hearts, paused: s.paused, duringOutcome: !!s.outcome,
          msShown: s.round ? Math.round(performance.now() - spawnedAt.current) : null,
        })
      }
      flushTelemetry()
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
    if (megaQueued.current && state.round && !state.outcome && !state.paused && !state.preview) megaCast()
  }, [state.round, state.outcome, state.paused, state.preview, megaCast])
  useEffect(() => {
    if (state.mega < MEGA_MAX) {
      setLightning(false)
      megaQueued.current = false
    }
  }, [state.mega])
  useEffect(() => () => window.clearTimeout(cueTimer.current), [])

  return { state, banner, newBest, shake, cue, lightning, celebrate, speaking, hidden, fx, feedback, start, choose, megaCast, pause, resume, replayClue, sayMark }
}
