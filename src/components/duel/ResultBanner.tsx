// After each round: the mark and its picture word; the wizard says name → sound → word. No text.
import { motion } from 'framer-motion'
import type { DuelMark, PictureWord } from '../../types/duel'
import { WORD_PICTURE } from '../../assets/duel/sprites'
import { RuneGlyph } from './RuneGlyph'

export function ResultBanner({ mark, word, kind }: { mark: DuelMark; word: PictureWord; kind: 'hit' | 'miss' }) {
  return (
    <motion.div
      className={`nd-resolve ${kind}`}
      style={{ x: '-50%' }}
      initial={{ y: -30, opacity: 0, scale: 0.7 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: kind === 'hit' ? 0.35 : 0.2, type: 'spring' }}
    >
      <RuneGlyph mark={mark} size={58} />
      <img className="nd-word-pic nd-word-banner" src={WORD_PICTURE[word.key]} alt="" draggable={false} />
    </motion.div>
  )
}
