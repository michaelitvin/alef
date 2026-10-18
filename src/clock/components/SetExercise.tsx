// Set the clock, by voice or by a digital card (spec: Exercise 3, Variants by level).
import { phrase } from '../logic/phrases'
import { digital, type HandPose } from '../logic/time'
import type { Exercise, Hint, RoundPlan } from '../logic/types'
import { Caption, type CaptionScript } from './Caption'
import { DigitalCard } from './DigitalCard'
import { SpeakerIcon } from './icons'
import { HandSetter } from './HandSetter'
import { clockExtent } from './ClockFace'
import { type Box, CAPTION_H, DIGITAL_PROMPT_H, setLayout } from './benchLayout'

export const setterMode = (e: Exercise): 'short' | 'long' | 'both' => (e === 'setShort' ? 'short' : e === 'setLong' ? 'long' : 'both')

/**
 * Where the hands start; never on the answer. Level 1: long hand on 12, short hand away from the answer.
 * Long hand only: short hand on the hour, long hand on 12 (never an o'clock target, see rounds.ts).
 * Both hands: long hand on 12, short hand on the opposite hour (never on the 12, where the long hand hides it).
 */
export function initialPose(plan: RoundPlan): HandPose {
  const h = plan.time.h % 12
  // five hours away; never on the 12, where the long hand hides it (QA 2026-10-15: seven o'clock started hidden)
  if (plan.exercise === 'setShort') return { hour: (h * 30 + (h === 7 ? 120 : 150)) % 360, minute: 0 }
  if (plan.exercise === 'setLong') return { hour: h * 30, minute: 0 }
  const away = (h + 6) % 12 || (h + 5) % 12
  return { hour: away * 30, minute: 0 }
}

export interface SetExerciseProps {
  plan: RoundPlan
  script: CaptionScript
  locked: boolean
  word: { target: 'prompt'; index: number } | null
  reveal: HandPose | null
  onSubmit: (pose: HandPose) => void
  onReplay: () => void
  onSnap: () => void
  /** the bench's free box */
  box: Box
  /** the prompt caption shows from when the voice starts to read it (default: shown) */
  heard?: boolean
  /** the hint shown on the clock now (quarters / minutes), if any */
  hint?: Hint | null
}

export function SetExercise({ plan, script, locked, word, reveal, onSubmit, onReplay, onSnap, box, heard = true, hint = null }: SetExerciseProps) {
  const p = phrase(plan.time, plan.lang, plan.digital40)
  const lay = setLayout(box, (clip) => clockExtent(plan.kind, clip), plan.exercise === 'digitalSet' ? DIGITAL_PROMPT_H : CAPTION_H)
  return (
    <div className={`ck-ex ck-ex-set${lay.compact ? ' ck-compact' : ''}`} data-exercise={plan.exercise}>
      {/* the question, with a speaker beside it that says it again (the parent 2026-10-17) */}
      <div className="ck-prompt-row" dir={plan.lang === 'he' ? 'rtl' : 'ltr'}>
        {plan.exercise === 'digitalSet' ? (
          <DigitalCard text={digital(plan.time.h, plan.time.m)} />
        ) : (
          <Caption words={p.words} lang={plan.lang} script={script} active={word ? word.index : -1} onTap={onReplay} hidden={!heard} />
        )}
        <button aria-label="listen" className="ck-listen" style={heard ? undefined : { visibility: 'hidden' }}
          onPointerDown={(e) => { e.stopPropagation(); onReplay() }}>
          <SpeakerIcon />
        </button>
      </div>
      <HandSetter key={`${plan.time.h}-${plan.time.m}-${plan.exercise}`} mode={setterMode(plan.exercise)} linked={plan.linked}
        initial={initialPose(plan)} numbers={plan.scaffolds.numbers} ring={hint ?? false} slice={plan.scaffolds.slice}
        kind={plan.kind} size={lay.size} caseClip={lay.clip} layout={lay.dir} locked={locked} reveal={reveal} onSubmit={onSubmit} onSnap={onSnap} />
    </div>
  )
}
