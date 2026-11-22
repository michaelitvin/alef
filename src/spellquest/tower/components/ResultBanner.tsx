// After each round: the mark and its picture word; the wizard says sound → name → word, and the part being said
// animates (sound → the vowel marks, name → the whole rune, word → the picture). No text.
import { motion } from 'framer-motion'
import type { TowerMark, PictureWord, TowerRune } from '../types'
import { WORD_PICTURE } from '../assets/sprites'
import { RuneGlyph } from './RuneGlyph'

/**
 * `rune` and `picture`: a course's round (English) shows its own rune and its own picture (none: no picture); a Hebrew
 * round the mark and its picture word.
 */
export function ResultBanner({ mark, word, kind, speaking = null, rune, picture }: {
  mark: TowerMark; word: PictureWord; kind: 'hit' | 'miss'; speaking?: 'sound' | 'name' | 'word' | null; rune?: TowerRune; picture?: string
}) {
  const src = rune ? picture : WORD_PICTURE[word.key]
  return (
    <motion.div
      className={`nd-resolve ${kind}`}
      data-speaking={speaking ?? undefined}
      style={{ x: '-50%' }}
      initial={{ y: -30, opacity: 0, scale: 0.7 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: kind === 'hit' ? 0.35 : 0.2, type: 'spring' }}
    >
      <RuneGlyph mark={mark} rune={rune} size={58} />
      {src && <img className="nd-word-pic nd-word-banner" src={src} alt="" draggable={false} />}
    </motion.div>
  )
}
