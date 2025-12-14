import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { WordCard } from './WordCard'

export interface WordIntroProps {
  /** The Hebrew word to introduce */
  word: string
  /** Syllable breakdown of the word */
  syllables: string[]
  /** English translation */
  translation: string
  /** Called when user clicks the word to hear it */
  onPlayWord?: () => void
  /** Called when user clicks a syllable to hear it */
  onPlaySyllable?: (index: number) => void
  /** Called when user is ready to continue */
  onContinue?: () => void
}

/**
 * WordIntro - Introduces a new word to the learner
 * Shows the word with syllable breakdown and pronunciation
 */
export function WordIntro({
  word,
  syllables,
  onPlayWord,
  onPlaySyllable,
  onContinue,
}: WordIntroProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[6],
        padding: spacing[4],
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      {/* Word display */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <WordCard
          word={word}
          syllables={syllables}
          size="lg"
          animate="pulse"
          showGlow
          showSyllables
          onClick={onPlayWord}
          onSyllableClick={onPlaySyllable}
        />
      </motion.div>

      {/* Syllable practice hint */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          backgroundColor: colors.primary[50],
          padding: spacing[4],
          borderRadius: borderRadius.xl,
          textAlign: 'center',
          width: '100%',
        }}
      >
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.base,
            color: colors.primary[700],
          }}
        >
          לחץ על כל הברה כדי לשמוע אותה 🔊
        </p>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{
          display: 'flex',
          gap: spacing[3],
          width: '100%',
        }}
      >
        <motion.button
          onClick={onPlayWord}
          style={{
            flex: 1,
            padding: `${spacing[3]} ${spacing[4]}`,
            borderRadius: borderRadius.xl,
            border: `2px solid ${colors.primary[300]}`,
            backgroundColor: colors.surface,
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.lg,
            color: colors.primary[600],
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          🔊 שמע מילה
        </motion.button>

        <motion.button
          onClick={onContinue}
          style={{
            flex: 1,
            padding: `${spacing[3]} ${spacing[4]}`,
            borderRadius: borderRadius.xl,
            border: 'none',
            backgroundColor: colors.primary[500],
            boxShadow: shadows.md,
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.surface,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
          }}
          whileHover={{ scale: 1.02, backgroundColor: colors.primary[600] }}
          whileTap={{ scale: 0.98 }}
        >
          המשך ←
        </motion.button>
      </motion.div>
    </div>
  )
}

export default WordIntro
