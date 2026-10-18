// The workshop screen: the bench, with the customer at the door (spec: Screens and layout).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useWorkday } from '../useWorkday'
import { useClockStore } from '../store'
import { poseOf } from '../logic/time'
import { ChoiceExercise, TEST_HOOKS } from '../components/ChoiceExercise'
import { SetExercise } from '../components/SetExercise'
import { ExplainPlayer } from '../components/ExplainPlayer'
import { Customer } from '../components/Customer'
import { benchSide } from '../assets/facing'
import { PauseCover } from '../components/PauseCover'
import { GearPileIcon, HintIcon, HomeIcon, PlayIcon } from '../components/icons'
import { clockTelemetry } from '../telemetry'
import type { RoundPlan } from '../logic/types'
import { StreakBurst } from '../components/StreakBurst'
import { Bonus } from './Bonus'
import { Summary } from './Summary'
import { startMusic, stopMusic, stopVoices } from '../audio/clockAudio'

const portrait = () => window.innerHeight > window.innerWidth
/** A first guess before the bench is measured (and in tests, where nothing has a size). */
const guessBox = () =>
  portrait()
    ? { w: window.innerWidth - 16, h: window.innerHeight - (window.innerHeight <= 720 ? 48 + 92 : 56 + 132) - 16 }
    : { w: window.innerWidth * 0.8 - 16, h: window.innerHeight - 16 }

/** The bench's free box, measured, so the exercise fits its clocks, cases and cards inside it. */
function useBenchBox() {
  const [el, ref] = useState<HTMLElement | null>(null)
  const [box, setBox] = useState(guessBox)
  const [port, setPort] = useState(portrait)
  useLayoutEffect(() => {
    const measure = () => {
      setPort(portrait())
      const w = el?.clientWidth ?? 0
      const h = el?.clientHeight ?? 0
      const next = w > 0 && h > 0 ? { w: w - 16, h: h - 16 } : guessBox()
      setBox((b) => (Math.abs(b.w - next.w) < 1 && Math.abs(b.h - next.h) < 1 ? b : next))
    }
    measure()
    window.addEventListener('resize', measure)
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (ro && el) ro.observe(el)
    return () => { window.removeEventListener('resize', measure); ro?.disconnect() }
  }, [el])
  return { ref, box, portrait: port }
}

export function Workshop({ onExit }: { onExit: () => void }) {
  const { view, choose, submit, replay, snap, next, explainAgain, bonusDone, bonusTry, again, paused, resume } = useWorkday()
  const gears = useClockStore((s) => s.gears)
  const workdays = useClockStore((s) => s.workdays)
  const { ref: benchRef, box, portrait: port } = useBenchBox()
  const size = Math.min(box.w, box.h)
  // the hint button opens the hint for this round only
  const [hintPlan, setHintPlan] = useState<RoundPlan | null>(null)
  // the parent: no music while customers and questions are on; it plays in the bonus game and on the day summary
  const track = useRef(workdays).current
  const music = view?.phase === 'bonus' || view?.phase === 'summary'
  useEffect(() => {
    if (music) startMusic(track)
    else stopMusic()
  }, [music, track])
  useEffect(() => () => { stopMusic(); stopVoices() }, [])

  if (!view) return <div className="ck-root" />
  const { plan } = view
  // the hint that fits the time: by itself in his first rounds with it, after a mistake (on the right answer), or when he
  // taps the hint button (the parent 2026-10-17)
  const hint = plan.scaffolds.hint
  const hintOn = !!hint && (plan.scaffolds.hintAuto || hintPlan === plan || view.awaitNext)
  const shownHint = hintOn ? hint : null
  const hintButton = !!hint && !hintOn && (view.phase === 'ask' || view.phase === 'answer')
  const openHint = () => { setHintPlan(plan); clockTelemetry.track('hint', { hint, time: `${plan.time.h}-${plan.time.m}`, exercise: plan.exercise }) }
  const isSet = !['find', 'what', 'digitalPick'].includes(plan.exercise)

  return (
    <div className="ck-root ck-workshop" data-phase={view.phase}>
      <button aria-label="home" className="ck-home" onClick={onExit}><HomeIcon /></button>
      {/* the top bar's right end: the hint button (when there is a hint to ask for) beside the gears, above the bench, so it
          never covers the question (the parent 2026-10-17: under the gears it hid text) */}
      <div className="ck-topright">
        {hintButton && <button aria-label="hint" className="ck-hint-btn" onClick={openHint}><HintIcon size={36} /></button>}
        <div className="ck-gears"><GearPileIcon size={44} /><span className="ck-count">{gears}</span></div>
      </div>
      <main className="ck-bench" ref={benchRef}>
        {view.phase === 'bonus' ? (
          paused ? null : <Bonus onDone={bonusDone} onTry={bonusTry} />
        ) : view.phase === 'summary' ? (
          <Summary gears={view.gearsToday} fixedKinds={view.fixedKinds} onAgain={again} />
        ) : view.explain ? (
          // a new explanation starts with its own clock (QA 2026-10-15: carried over, the long hand glided backwards from
          // the last one's pose)
          <ExplainPlayer key={`${view.explain.id}-${view.explain.run}`} id={view.explain.id} lang={view.explain.lang} script={view.script} word={view.explain.word}
            cues={view.explain.cues} fallback={plan.time} size={size} onReplay={view.awaitNext ? explainAgain : undefined} />
        ) : view.phase === 'enter' || view.phase === 'explain' ? (
          // the customer comes in and the explanations play first: the question is not shown before them, so it is
          // never shown and then hidden (rule)
          null
        ) : isSet ? (
          <>
            <SetExercise plan={plan} script={view.script} locked={view.locked} reveal={view.reveal === null && ['feedback', 'levelup', 'leave'].includes(view.phase) ? view.revealPose : null}
              word={view.word && view.word.target === 'prompt' ? { target: 'prompt', index: view.word.index } : null}
              onSubmit={submit} onReplay={() => replay('prompt')} onSnap={snap} box={box} heard={view.heard.prompt} hint={shownHint} />
            {TEST_HOOKS && <button data-test-solve style={{ display: 'none' }} onClick={() => submit(poseOf(plan.time))} />}
          </>
        ) : (
          <ChoiceExercise plan={plan} script={view.script} locked={view.locked} glowCard={view.glowCard} word={view.word}
            reveal={view.reveal} onChoose={choose} onReplay={replay} box={box} ticking={!['enter', 'explain', 'ask'].includes(view.phase)}
            heard={view.heard} hint={shownHint} />
        )}
        {view.burst && ['feedback', 'levelup', 'leave'].includes(view.phase) && <StreakBurst />}
      </main>
      <aside className="ck-side ck-side-door">
        {/* the customer only: the fixed clocks have their own moments (the day summary, the door) */}
        {view.phase !== 'bonus' && view.phase !== 'summary' && <Customer id={view.customer.id} mood={view.mood} toward={benchSide(port)} />}
      </aside>
      {/* after a mistake the right answer stays until he taps on (the parent 2026-10-17: no automatic next question) */}
      {view.awaitNext && (
        <motion.button aria-label="next" className="ck-next" onClick={next}
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.1, 1], opacity: 1 }} transition={{ duration: 0.4 }}>
          <PlayIcon size={88} />
        </motion.button>
      )}
      {paused && <PauseCover onResume={resume} />}
    </div>
  )
}
