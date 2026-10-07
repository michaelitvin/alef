// The monster's clue, by screen type: A picture sign (tap = hear the word), B sound / C name (tap = replay),
// B shva = the mute monster, D the rune on its shield. No text: icons and pictures only.
import { useRef } from 'react'
import { motion } from 'framer-motion'
import type { Round } from '../../types/duel'
import { WORD_PICTURE } from '../../assets/duel/sprites'
import { Icon } from './Icon'
import { RuneGlyph } from './RuneGlyph'

/**
 * Replay on the finger's touch, not on a completed click: the bubble walks with its monster, and a click is lost
 * if the finger slides off it before lifting. The click that follows a touch is ignored; a keyboard click replays.
 */
function useReplayTap(onReplay: () => void) {
  const touched = useRef(false)
  return {
    onPointerDown: () => {
      touched.current = true
      onReplay()
    },
    onClick: () => {
      if (touched.current) touched.current = false
      else onReplay()
    },
    whileTap: { scale: 1.25 }, // he sees the tap land before the sound starts
    ...ARRIVE,
  }
}

/** The bubble pops and wiggles as its monster appears, to draw his eye to the clue. */
const ARRIVE = {
  initial: { scale: 0, rotate: -20 },
  animate: { scale: [0, 1.4, 0.92, 1.08, 1], rotate: [-20, 12, -8, 4, 0] },
  transition: { duration: 0.9, ease: 'easeOut' as const },
}

export function Clue({ round, onReplay }: { round: Round; onReplay: () => void }) {
  const tap = useReplayTap(onReplay)
  if (round.type === 'A')
    return (
      <motion.button className="nd-clue nd-clue-sign" {...tap} aria-label="hear the word">
        <img className="nd-word-pic" src={WORD_PICTURE[round.word.key]} alt="" draggable={false} />
      </motion.button>
    )
  if (round.type === 'D')
    return (
      <motion.div className="nd-clue nd-clue-shield" {...ARRIVE}>
        <RuneGlyph mark={round.target} box size={54} />
      </motion.div>
    )
  if (round.type === 'B' && round.target.group === 'silent')
    return (
      <motion.div className="nd-clue" {...ARRIVE}>
        <Icon name="speakerOff" size={34} />
        <Icon name="puff" size={34} />
      </motion.div>
    )
  return (
    <motion.button className="nd-clue nd-clue-audio" {...tap} aria-label="hear again">
      <Icon name={round.type === 'B' ? 'speaker' : 'talk'} size={34} />
    </motion.button>
  )
}
