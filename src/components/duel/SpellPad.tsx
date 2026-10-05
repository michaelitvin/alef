// The spell pad: runes (A/B/C) or picture words (D). States: almost (forgiven twin), hit, miss, reveal.
import { motion } from 'framer-motion'
import type { Choice, Outcome, Round } from '../../types/duel'
import { isCorrect, keyOf } from '../../utils/duel/rules'
import { WORD_PICTURE } from '../../assets/duel/sprites'
import { RuneGlyph } from './RuneGlyph'

interface Props {
  round: Round
  outcome: Outcome | null
  twinTried: string | null
  oneRow: boolean
  onChoose: (c: Choice) => void
  /** verify/test builds only: marks the right answers for headless checks */
  showTestHooks: boolean
}

export function SpellPad({ round, outcome, twinTried, oneRow, onChoose, showTestHooks }: Props) {
  const choices: Choice[] =
    round.type === 'D' ? round.padWords.map((w) => ({ kind: 'sound', group: w.group })) : round.runes.map((mark) => ({ kind: 'rune', mark }))
  const wordFor = (g: string) => round.padWords.find((w) => w.group === g)!
  const cols = oneRow ? choices.length : choices.length === 4 ? 2 : 3
  return (
    <div className="nd-pad" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {choices.map((c) => {
        const k = keyOf(c)
        const right = isCorrect(round, c)
        let state = !outcome && k === twinTried ? 'almost' : ''
        if (outcome) {
          if (k === outcome.choiceKey) state = outcome.kind === 'hit' ? 'hit' : 'miss'
          else if (outcome.kind === 'miss' && right) state = 'reveal'
        }
        return (
          <motion.button
            key={`${round.id}-${k}`}
            className={`nd-rune ${state}`}
            {...(showTestHooks ? { 'data-correct': right ? '1' : '0' } : {})}
            disabled={Boolean(outcome)}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={state === 'miss' ? { x: [0, -8, 8, -5, 5, 0], scale: 1, opacity: 1 } : { scale: state === 'hit' ? 1.12 : 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChoose(c)}
          >
            {c.kind === 'rune' ? (
              <RuneGlyph mark={c.mark} size={60} />
            ) : (
              <img className="nd-word-pic nd-word-btn" src={WORD_PICTURE[wordFor(c.group).key]} alt="" draggable={false} />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
