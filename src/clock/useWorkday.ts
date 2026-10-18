// The workday controller (spec: Exercises, Feedback, Explanations, Workday). One async script per round drives
// what is spoken and what glows; answers resolve a promise the script awaits. A pause cancels the script and
// restarts the round. Rule: answer taps do not count while the narration plays.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Rng } from '../shared/adaptive'
import { useClockStore } from './store'
import { clockTelemetry } from './telemetry'
import { type ClockTime, type HandPose, MAX_LEVEL, minutesUpTo, poseOf, timeId } from './logic/time'
import { phrase, type Lang } from './logic/phrases'
import { evaluateChoice, evaluateSet, type Evaluation } from './logic/grade'
import { exerciseIntro, fixFor, introsFor, type ExplainId } from './logic/levels'
import { checkFor, planRound } from './logic/rounds'
import { WORKDAY_LENGTH, dayKey, kindInfo, langForRound, pickCustomer, realTimeFor, type ClockKind, type Customer } from './logic/workday'
import type { Exercise, RoundPlan } from './logic/types'
import { CUSTOMER_LINES, REQUEST_ASKS, customerAudioId, lineAudioId, lineById, parseLine, requestFor, type Cue, type Request } from './data/lines'
import { holdClockAudio, playSfx, playVoice, preloadVoices, stopVoices } from './audio/clockAudio'
import { scriptFor, type CaptionScript } from './components/Caption'
import { explainLineId } from './components/ExplainPlayer'

export type Phase = 'enter' | 'explain' | 'ask' | 'answer' | 'feedback' | 'levelup' | 'leave' | 'bonus' | 'summary'
export interface WorkdayView {
  phase: Phase
  plan: RoundPlan
  customer: Customer
  script: CaptionScript
  served: number
  gearsToday: number
  /** correct answers today (the clocks he fixed) */
  fixedToday: number
  /** the kinds of the clocks he fixed today, in order (the day summary hangs them up) */
  fixedKinds: ClockKind[]
  streak: number
  /** the 10-in-a-row celebration is showing */
  burst: boolean
  glowCard: number | null
  word: { target: 'prompt' | number; index: number } | null
  /** captions the voice has started to read (rule: text shows only while, or after, the voice says it): the prompt
   * caption, and how many answer cards (What time is it) */
  heard: Heard
  /** run: counts the plays of this explanation (a replay starts its picture afresh) */
  explain: { id: ExplainId; lang: Lang; cues: Cue[]; word: number; run: number } | null
  reveal: { chosen: number; correct: number } | null
  revealPose: HandPose | null
  mood: 'idle' | 'happy'
  locked: boolean
  levelUpTo: number | null
  /** after a mistake: the answer stays on the bench until he taps the next button (the parent 2026-10-17) */
  awaitNext: boolean
}
export interface Heard { prompt: boolean; cards: number }
export const HEARD_ALL: Heard = { prompt: true, cards: 3 }
type Answer = { kind: 'choice'; index: number } | { kind: 'set'; pose: HandPose }
/** A round that started but is not committed yet: a pause keeps it, and resume asks the same question again. */
interface OpenRound { plan: RoundPlan; customer: Customer; script: CaptionScript; lang: Lang; real: ClockTime | null; firstOfDay: boolean; today: string }

const CANCEL = Symbol('cancel')
const CONFIDENT_MS = 6000
/** Pauses between the steps of a round (ms). The playtest: "gameplay feels slow" (a round had about 5 s of waiting
 * between his answer and the next question). */
export const PACE = { doorbell: 350, betweenAnswers: 150, afterBoing: 250, afterFix: 250, leave: 350 }

export function useWorkday({ rng = Math.random, now = () => new Date() }: { rng?: Rng; now?: () => Date } = {}) {
  const [view, setView] = useState<WorkdayView | null>(null)
  const [paused, setPaused] = useState(false)
  const [roundKey, setRoundKey] = useState(0)
  const answerRef = useRef<((a: Answer) => void) | null>(null)
  const bonusRef = useRef<((g: number) => void) | null>(null)
  const nextRef = useRef<(() => void) | null>(null)
  const explainRef = useRef<((r: 'next' | 'again') => void) | null>(null)
  const newDay = (streak = 0) => ({ served: 0, gears: 0, fixed: 0, fixedKinds: [] as ClockKind[], streak, lastCustomer: undefined as string | undefined, phase: 'rounds' as 'rounds' | 'bonus' | 'done', lang: 'en' as Lang })
  const day = useRef(newDay())
  const viewRef = useRef<WorkdayView | null>(null)
  viewRef.current = view
  const open = useRef<OpenRound | null>(null)
  /** the variation of each request said last (never the same one twice in a row) */
  const lastAsk = useRef<Partial<Record<Request, number>>>({})

  const patch = (p: Partial<WorkdayView>) => setView((v) => (v ? { ...v, ...p } : v))

  useEffect(() => {
    if (paused) return
    const token = { alive: true }
    const live = () => { if (!token.alive) throw CANCEL }
    const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms)).then(live)
    /** `caption`: the caption words on screen that this audio reads ([] when it has no caption) */
    const say = async (id: string, caption: string[], onWord?: (i: number) => void) => {
      live()
      await playVoice(id, caption, (i) => token.alive && onWord?.(i))
      live()
    }
    const waitAnswer = () => new Promise<Answer>((resolve) => { answerRef.current = resolve }).then((a) => { live(); return a })

    const explain = async (id: ExplainId, lang: Lang, trigger: 'intro' | 'fix') => {
      clockTelemetry.track('explain', { id, trigger, lang })
      const line = lineById(explainLineId(id))!
      const { words, cues } = parseLine(line[lang])
      let run = 0
      const play = async () => {
        run++
        const fired: Cue[] = []
        patch({ phase: 'explain', explain: { id, lang, cues: [], word: -1, run }, awaitNext: false })
        await say(lineAudioId(explainLineId(id), lang), words, (i) => {
          cues.filter((c) => c.word === i).forEach((c) => fired.push(c.cue))
          patch({ explain: { id, lang, cues: [...fired], word: i, run } })
        })
        patch({ explain: { id, lang, cues: [...fired], word: words.length, run } })
      }
      await play()
      useClockStore.getState().markExplained(id)
      // the explanation stays until he taps next, for as long as he needs; its speaker plays it again (the parent 2026-10-17)
      for (;;) {
        patch({ awaitNext: true })
        const r = await new Promise<'next' | 'again'>((resolve) => { explainRef.current = resolve })
        explainRef.current = null
        live()
        if (r === 'next') break
        clockTelemetry.track('explain-again', { id, lang })
        await play()
      }
      patch({ explain: null, awaitNext: false })
    }

    const round = async () => {
      const d = day.current
      // a pause before the round was committed: the same customer asks the same question again
      const resumed = open.current
      let o: OpenRound
      if (resumed) o = resumed
      else {
        const st = useClockStore.getState()
        const level = st.progress.level
        const lang = langForRound(d.served, st.settings.langs)
        const today = dayKey(now())
        // the real-time question: at most once a day, on the first workday (spent even when his levels do not cover the time)
        const firstOfDay = d.served === 0 && st.lastRealTimeDay !== today
        const real = firstOfDay ? realTimeFor(now(), minutesUpTo(level)) : null
        const plan = planRound({
          level, lang, rng, tallies: st.tallies, recent: st.recent, confusions: st.confusions, hintsSeen: st.hintsSeen,
          forcedTime: real ?? undefined, forcedExercise: real ? 'what' : undefined,
        })
        const customer = pickCustomer(rng, lang, d.lastCustomer)
        d.lastCustomer = customer.id
        const script = scriptFor(lang, d.served, st.settings)
        o = { plan, customer, script, lang, real, firstOfDay, today }
        // a hint that shows by itself counts towards the rounds before it waits behind the hint button
        if (plan.scaffolds.hint && plan.scaffolds.hintAuto) st.noteHint(plan.scaffolds.hint)
        open.current = o
      }
      const { plan, customer, script, lang, real, firstOfDay, today } = o
      const request = requestFor(plan.exercise, !!real)
      const level = useClockStore.getState().progress.level
      d.lang = lang
      preloadVoices([phrase(plan.time, lang, plan.digital40).audioId, ...plan.options.filter((x) => x.time).map((x) => phrase(x.time!, lang, plan.digital40).audioId)])
      setView({
        phase: 'enter', plan, customer, script, served: d.served, gearsToday: d.gears, fixedToday: d.fixed, fixedKinds: [...d.fixedKinds], streak: d.streak, burst: false, glowCard: null,
        word: null, heard: { prompt: false, cards: 0 }, explain: null, reveal: null, revealPose: null, mood: 'idle', locked: true, levelUpTo: null, awaitNext: false,
      })

      // the customer comes in (not again after a pause: he is still at the bench)
      if (!resumed) {
        // the bell rings as he comes in; the round goes on while it rings
        void playSfx('doorbell')
        await wait(PACE.doorbell)
        // he asks for what this round is about (the parent 2026-10-16: the hello and the question had no connection)
        const n = CUSTOMER_LINES[lang].ask[request].length
        let v = Math.floor(rng() * n)
        if (n > 1 && v === lastAsk.current[request]) v = (v + 1) % n
        lastAsk.current[request] = v
        await say(customerAudioId(customer.id, request, v), [])
      }
      // first-time explanations, each with its own picture; the question is not on the bench yet (rule: do not show a
      // question and then hide it)
      const intros = introsFor(useClockStore.getState(), plan)
      for (const id of intros) await explain(id, lang, 'intro')

      // the question appears
      patch({ phase: 'ask', locked: true, explain: null })

      // answers count from now on, also while the question and the answers are read (the parent: do not make him wait
      // for all the answers); a tap stops the reading
      const tap: { early: Answer | null } = { early: null }
      const firstTap = new Promise<Answer>((resolve) => { answerRef.current = (x) => { tap.early = x; resolve(x) } })
      patch({ locked: false })
      const tAsk = performance.now()
      // the question (rule: every round says what to do); the first-time explanation of Find and What asks it already
      const askId = real ? 'ask-now' : askLineFor(plan.exercise)
      const askedByIntro = !real && intros.includes(exerciseIntro(plan.exercise)) && (plan.exercise === 'find' || plan.exercise === 'what')
      // the customer asked it already (What time is it, Clock to digital, the time now), unless a pause hid his request or an
      // explanation came between his question and the answers (the parent 2026-10-17: after the explanation "I don't
      // remember the question anymore"): the question always comes right before the answers
      const askedByCustomer = !resumed && REQUEST_ASKS.includes(request) && intros.length === 0
      if (!askedByIntro && !askedByCustomer) await say(lineAudioId(askId, lang), [])
      const audio: string[] = [] // the prompt/option audio played for this round (assets used)
      const ask = async () => {
        if (plan.exercise === 'what') {
          for (let i = 0; i < plan.options.length && !tap.early; i++) {
            const p = phrase(plan.options[i].time!, lang, plan.digital40)
            patch({ glowCard: i, word: { target: i, index: -1 }, heard: { prompt: false, cards: i + 1 } })
            audio.push(p.audioId)
            await say(p.audioId, p.words, (w) => { if (!tap.early) patch({ word: { target: i, index: w } }) })
            if (tap.early) break
            patch({ word: { target: i, index: p.words.length } })
            await wait(PACE.betweenAnswers)
          }
          patch({ glowCard: null, word: null })
        } else if (plan.exercise !== 'digitalPick' && plan.exercise !== 'digitalSet') {
          const p = phrase(plan.time, lang, plan.digital40)
          audio.push(p.audioId)
          patch({ heard: { prompt: true, cards: 0 } })
          await say(p.audioId, p.words, (w) => { if (!tap.early) patch({ word: { target: 'prompt', index: w } }) })
          if (!tap.early) patch({ word: { target: 'prompt', index: p.words.length } })
        }
      }
      if (!tap.early) await ask()

      // the answer (one near miss allowed in Set the clock)
      // all the answers are read (or he tapped one already): the cards he did not hear yet stay hidden
      const tOpen = performance.now()
      if (tap.early) patch({ phase: 'answer', word: null, glowCard: null })
      else patch({ phase: 'answer', locked: false, heard: HEARD_ALL })
      let forgiven = false
      let a = await firstTap.then((x) => { live(); return x })
      let ev = grade(plan, a, false)
      const firstAnswer = a
      if (ev.nearMiss) {
        forgiven = true
        patch({ locked: true })
        await say(lineAudioId('fb-almost', lang), [])
        patch({ locked: false })
        a = await waitAnswer()
        ev = grade(plan, a, true)
      }
      // from the moment all the answers were read; an answer during the reading counts from the tap (0)
      const ms = Math.round(performance.now() - tOpen)
      answerRef.current = null
      const { levelUp } = useClockStore.getState().recordRound(plan, ev, forgiven)
      open.current = null
      // the round is committed now: a pause from here on resumes with the NEXT round (or the bonus)
      if (firstOfDay) useClockStore.getState().setRealTimeDay(today)
      d.served++
      if (levelUp) {
        const to = useClockStore.getState().progress.level
        clockTelemetry.track('levelup', { to })
      }
      if (d.served >= WORKDAY_LENGTH) d.phase = 'bonus'
      clockTelemetry.track('round', {
        exercise: plan.exercise, lang, time: timeId(plan.time), level, kind: plan.kind, scaffolds: plan.scaffolds,
        options: plan.options.map((o) => ({ f: o.family, t: o.time && timeId(o.time), d: o.digital })),
        families: plan.families, answer: a, ...(forgiven ? { firstAnswer } : {}), correct: ev.correct, forgiven, tag: ev.tag, ms, script, audio,
        ...(tap.early ? { early: true, msFromAsk: Math.round(tOpen - tAsk) } : {}), resumed: !!resumed,
        predicted: Math.round(plan.predicted * 100) / 100, real: !!real, customer: customer.id,
      })

      // feedback
      patch({ phase: 'feedback', locked: true, word: null })
      const p = phrase(plan.time, lang, plan.digital40)
      // the phrase again, read along on the caption that shows it: the prompt, or the right answer card (What time is it);
      // Clock -> digital has no caption, so the voice speaks alone
      const target: 'prompt' | number | null = plan.exercise === 'what' ? plan.correctIndex : plan.exercise === 'digitalPick' || plan.exercise === 'digitalSet' ? null : 'prompt'
      const sayPhrase = () => say(p.audioId, target === null ? [] : p.words, (w) => { if (target !== null) patch({ word: { target, index: w } }) })
      if (ev.correct) {
        d.streak++
        d.gears++
        d.fixed++
        d.fixedKinds.push(plan.kind)
        useClockStore.getState().addGears(1)
        useClockStore.getState().noteStreak(d.streak)
        patch({
          mood: 'happy', streak: d.streak, gearsToday: d.gears, fixedToday: d.fixed, revealPose: poseOf(plan.time),
          reveal: a.kind === 'choice' ? { chosen: a.index, correct: plan.correctIndex } : null,
        })
        // the clock's own sound and the gear together
        await Promise.all([playSfx(kindInfo(plan.kind).sound), playSfx('gear')]); live()
        const confident = ms < CONFIDENT_MS && !forgiven
        if (!confident || plan.exercise === 'digitalPick') {
          await sayPhrase()
        }
        if (d.streak % 10 === 0) {
          patch({ burst: true })
          await playSfx('fanfare'); live()
          await say(lineAudioId('fb-streak', lang), [])
        }
        else if (d.streak % 5 === 0) { await playSfx('wallchime'); live() }
        else if (rng() < 0.3) await say(customerAudioId(customer.id, 'thanks'), [])
        else if (rng() < 0.3) await say(lineAudioId(`fb-cheer-${1 + (d.served % 3)}`, lang), [])
      } else {
        d.streak = 0
        patch({
          streak: 0, revealPose: poseOf(plan.time),
          reveal: a.kind === 'choice' ? { chosen: a.index, correct: plan.correctIndex } : null,
        })
        await playSfx('boing'); live()
        await wait(PACE.afterBoing)
        await sayPhrase()
        await wait(PACE.afterFix)
        // no automatic move on after a mistake (the parent 2026-10-17: "let the kid understand"): the right answer stays on
        // the bench until he taps next; then the mistake's explanation, when it is due, also waits for next
        patch({ phase: 'feedback', awaitNext: true })
        await new Promise<void>((resolve) => { nextRef.current = resolve })
        live()
        nextRef.current = null
        patch({ awaitNext: false })
        const fix = fixFor(useClockStore.getState(), ev.tag)
        if (fix) await explain(fix, lang, 'fix')
      }

      if (levelUp) {
        const to = useClockStore.getState().progress.level
        // a cheer over the solved question: a burst and a fanfare, then the voice (the parent 2026-10-17 dropped the clock
        // collection: a new kind of clock was not special, so a level up is not about a new clock)
        patch({ phase: 'levelup', levelUpTo: to, burst: true })
        await playSfx('fanfare'); live()
        await say(lineAudioId('fb-levelup', lang), [])
        if (to >= MAX_LEVEL) {
          // the last level: all the clocks chime for him
          await say(lineAudioId('fb-master', lang), [])
          await playSfx('wallchime'); live()
        }
      }

      patch({ phase: 'leave', mood: 'happy' })
      await wait(PACE.leave)
      if (d.phase === 'bonus') return bonus(lang)
      setRoundKey((k) => k + 1)
    }

    const bonus = async (lang: Lang) => {
      const d = day.current
      patch({ phase: 'bonus', served: d.served, locked: true, explain: null })
      const g = await new Promise<number>((r) => { bonusRef.current = r }).then((x) => { live(); return x })
      d.phase = 'done'
      d.gears += g
      useClockStore.getState().addGears(g)
      useClockStore.getState().finishWorkday()
      clockTelemetry.track('workday', { gears: d.gears, bonus: g })
      patch({ phase: 'summary', gearsToday: d.gears, fixedToday: d.fixed, fixedKinds: [...d.fixedKinds] })
      await say(lineAudioId('day-end', lang), [])
    }

    const run = () => {
      const d = day.current
      if (d.phase === 'done') { patch({ phase: 'summary' }); return Promise.resolve() }
      if (d.phase === 'bonus') return bonus(d.lang)
      return round()
    }
    run().catch((e) => { if (e !== CANCEL) console.error(e) })
    return () => {
      token.alive = false
      answerRef.current = null
      stopVoices()
    }
  }, [roundKey, paused]) // eslint-disable-line react-hooks/exhaustive-deps

  // the pause cover keeps all audio silent until he taps play (rule)
  useEffect(() => { holdClockAudio(paused) }, [paused])
  useEffect(() => () => holdClockAudio(false), [])

  // pause when the tablet locks (rule); resume asks the same question again (or, after the answer was counted, brings
  // the next customer)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (day.current.phase === 'done') return
        if (viewRef.current) clockTelemetry.track('pause', { phase: viewRef.current.phase })
        setPaused(true)
      }
    }
    const onHide = () => clockTelemetry.track('abandon', { served: day.current.served, phase: viewRef.current?.phase })
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onHide)
    }
  }, [])

  const accept = (a: Answer) => {
    if (!answerRef.current) return
    stopVoices() // a replay must not run into the feedback
    answerRef.current(a)
  }
  const choose = useCallback((index: number) => accept({ kind: 'choice', index }), [])
  const submit = useCallback((pose: HandPose) => accept({ kind: 'set', pose }), [])
  const snap = useCallback(() => { void playSfx('snap') }, [])
  /** the next button after a mistake */
  const next = useCallback(() => { if (explainRef.current) explainRef.current('next'); else nextRef.current?.() }, [])
  /** the explanation's speaker: plays it again (when it has finished) */
  const explainAgain = useCallback(() => explainRef.current?.('again'), [])
  const bonusDone = useCallback((g: number) => bonusRef.current?.(g), [])
  const bonusTry = useCallback((t: { try: number; angle: number; gears: number }) => clockTelemetry.track('bonus', t), [])
  /** the summary's play button: the next workday starts at once (the streak carries on) */
  const again = useCallback(() => {
    if (day.current.phase !== 'done') return
    stopVoices()
    day.current = newDay(day.current.streak)
    setRoundKey((k) => k + 1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const resume = useCallback(() => setPaused(false), [])
  const replay = useCallback((target: 'prompt' | number) => {
    const v = viewRef.current
    // during the reading the script owns the voice; the speaker buttons work once all the answers are read
    if (!v || v.locked || v.phase !== 'answer') return
    // Digital to clock: the question again, not the time (the voice would give the answer away)
    if (target === 'prompt' && v.plan.exercise === 'digitalSet') {
      stopVoices()
      void playVoice(lineAudioId('ask-digitalSet', v.plan.lang), [])
      return
    }
    const t = target === 'prompt' ? v.plan.time : v.plan.options[target].time
    if (!t) return
    const p = phrase(t, v.plan.lang, v.plan.digital40)
    stopVoices() // one voice at a time: a second tap restarts the reading instead of overlapping it
    void playVoice(p.audioId, p.words, (w) => { if (viewRef.current?.phase === 'answer') setView((x) => (x ? { ...x, word: { target, index: w } } : x)) })
  }, [])

  return { view, choose, submit, replay, snap, next, explainAgain, bonusDone, bonusTry, again, paused, resume }
}

function grade(plan: RoundPlan, a: Answer, nearMissUsed: boolean): Evaluation {
  if (a.kind === 'choice') return evaluateChoice(plan.options, plan.correctIndex, a.index)
  return evaluateSet(plan.time, a.pose, checkFor(plan.exercise), nearMissUsed)
}

/** The narrator's question for a round of this exercise. */
export function askLineFor(e: Exercise): string {
  if (e === 'find' || e === 'what' || e === 'digitalPick' || e === 'digitalSet') return `ask-${e}`
  return 'ask-set'
}
