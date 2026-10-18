// Find the clock · What time is it · Clock → digital (spec: Exercises 1, 2, 4).
import { motion } from 'framer-motion'
import { phrase } from '../logic/phrases'
import { poseOf } from '../logic/time'
import type { Hint, RoundPlan } from '../logic/types'
import { ClockFace, clockExtent } from './ClockFace'
import { type Box, FIND_CLIP, findLayout, pickLayout } from './benchLayout'
import { Caption, type CaptionScript } from './Caption'
import { DigitalCard } from './DigitalCard'
import { SpeakerIcon } from './icons'

export const TEST_HOOKS = import.meta.env.MODE === 'test' || import.meta.env.VITE_CLOCK_TEST === '1'

export interface ChoiceExerciseProps {
  plan: RoundPlan
  script: CaptionScript
  locked: boolean
  /** the card being read aloud (What time is it) */
  glowCard: number | null
  word: { target: 'prompt' | number; index: number } | null
  reveal: { chosen: number; correct: number } | null
  onChoose: (i: number) => void
  onReplay: (target: 'prompt' | number) => void
  /** the bench's free box: the layout fits the clocks, cases and cards into it */
  box: Box
  /** seconds hands tick (from the answer phase on); before that they wait at their trap positions */
  ticking?: boolean
  /** captions the voice has started to read; the others stay hidden (default: all) */
  heard?: { prompt: boolean; cards: number }
  /** the hint shown on the clocks now (quarters / minutes), if any */
  hint?: Hint | null
}

const wordAt = (word: ChoiceExerciseProps['word'], target: 'prompt' | number) => (word && word.target === target ? word.index : -1)

export function ChoiceExercise({ plan, script, locked, glowCard, word, reveal, onChoose, onReplay, box, ticking = true, heard = { prompt: true, cards: 3 }, hint = null }: ChoiceExerciseProps) {
  const { exercise, options, lang, scaffolds, kind } = plan
  const face = { numbers: scaffolds.numbers, ring: hint ?? false, slice: scaffolds.slice, kind }
  const choose = (i: number) => {
    if (!locked && !reveal) onChoose(i)
  }
  const state = (i: number) => (reveal ? (i === reveal.correct ? 'right' : i === reveal.chosen ? 'wrong' : 'dim') : glowCard === i ? 'reading' : '')
  const optionProps = (i: number) => ({
    'data-option': i,
    ...(TEST_HOOKS ? { 'data-correct': i === plan.correctIndex ? '1' : '0' } : {}),
    className: `ck-option ${state(i)}`,
    onPointerDown: () => choose(i),
    animate: state(i) === 'wrong' ? { x: [0, -10, 10, -6, 6, 0] } : state(i) === 'right' ? { scale: [1, 1.08, 1] } : { scale: glowCard === i ? 1.05 : 1 },
    transition: { duration: 0.5 },
  })

  if (exercise === 'find') {
    const p = phrase(plan.time, lang, plan.digital40)
    const lay = findLayout(box, clockExtent(kind, FIND_CLIP))
    return (
      <div className="ck-ex ck-ex-find" data-exercise={exercise}>
        {/* the time, with a speaker that says it again (rule: a speaker on all that plays when tapped) */}
        <div className="ck-prompt-row" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <Caption words={p.words} lang={lang} script={script} active={wordAt(word, 'prompt')} onTap={() => onReplay('prompt')} hidden={!heard.prompt} />
          <button aria-label="listen" className="ck-listen" style={heard.prompt ? undefined : { visibility: 'hidden' }}
            onPointerDown={(e) => { e.stopPropagation(); onReplay('prompt') }}>
            <SpeakerIcon />
          </button>
        </div>
        <div className={`ck-shelf ck-shelf-${lay.dir}`}>
          {options.map((o, i) => (
            <motion.div key={i} {...optionProps(i)}>
              <ClockFace pose={o.pose} {...face} size={lay.size} caseClip={FIND_CLIP}
                secondsFrom={scaffolds.seconds ? (o.pose.second ?? (i * 97) % 360) : null} secondsFrozen={!ticking} />
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const lay = pickLayout(box, (clip) => clockExtent(kind, clip), exercise === 'what' ? 'text' : 'digital')
  const cls = `ck-ex ck-ex-pick ck-ex-${lay.dir}${lay.compact ? ' ck-compact' : ''}${lay.tight ? ' ck-tight' : ''}`
  const main = (
    <ClockFace pose={poseOf(plan.time)} {...face} size={lay.size} caseClip={lay.clip} secondsFrom={scaffolds.seconds ? (plan.secondsAt ?? 0) : null} secondsFrozen={!ticking} />
  )
  // The whole card answers. Its speaker button sits beside it, at the end of the reading direction,
  // so a tap anywhere on the card never replays instead of answering.
  if (exercise === 'what')
    return (
      <div className={cls} data-exercise={exercise}>
        {main}
        <div className="ck-cards" style={{ width: lay.cardW }}>
          {options.map((o, i) => {
            const p = phrase(o.time!, lang, plan.digital40)
            return (
              // a card appears when the voice starts to read it (rule: text shows only while the voice says it); after an
              // answer during the reading, the right card appears with the voice that reads it in the feedback
              <div key={i} className="ck-card-row" dir={lang === 'he' ? 'rtl' : 'ltr'} style={i < heard.cards || reveal?.correct === i ? undefined : { visibility: 'hidden' }}>
                <motion.div {...optionProps(i)}>
                  <Caption words={p.words} lang={lang} script={script} active={wordAt(word, i)} size="card" />
                </motion.div>
                <button aria-label="listen" className="ck-listen"
                  onPointerDown={(e) => { e.stopPropagation(); onReplay(i) }}>
                  <SpeakerIcon />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )

  return (
    <div className={cls} data-exercise={exercise}>
      {main}
      <div className="ck-cards" style={{ width: lay.cardW }}>
        {options.map((o, i) => (
          <motion.div key={i} {...optionProps(i)}>
            <DigitalCard text={o.digital} size={lay.compact ? 0.7 : 1} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
