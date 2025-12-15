import { useState } from 'react'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'

export interface SentenceReaderProps {
  /** The Hebrew sentence to read */
  sentence: string
  /** Individual words in the sentence */
  words: string[]
  /** Called when user clicks a word to hear it */
  onPlayWord?: (index: number) => void
  /** Called when user clicks to hear full sentence */
  onPlaySentence?: () => void
  /** Called when user is ready to continue */
  onContinue?: () => void
}

/**
 * SentenceReader - Interactive sentence reading component
 * Shows the sentence with clickable words for pronunciation
 */
export function SentenceReader({
  sentence,
  words,
  onPlayWord,
  onPlaySentence,
  onContinue,
}: SentenceReaderProps) {
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null)

  const handleWordClick = (index: number) => {
    setActiveWordIndex(index)
    onPlayWord?.(index)
    // Reset after a moment
    setTimeout(() => setActiveWordIndex(null), 800)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[6],
        padding: spacing[4],
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      {/* Full sentence display */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          padding: spacing[4],
          backgroundColor: colors.surface,
          borderRadius: borderRadius['2xl'],
          boxShadow: shadows.lg,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <motion.p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            lineHeight: 1.6,
            direction: 'rtl',
            cursor: 'pointer',
          }}
          onClick={onPlaySentence}
          whileHover={{ scale: 1.02 }}
        >
          {sentence}
        </motion.p>
      </motion.div>

      {/* Word-by-word breakdown */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          backgroundColor: colors.primary[50],
          padding: spacing[4],
          borderRadius: borderRadius.xl,
          width: '100%',
        }}
      >
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.base,
            color: colors.primary[700],
            textAlign: 'center',
            marginBottom: spacing[3],
          }}
        >
          לחץ על כל מילה כדי לשמוע אותה:
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: spacing[2],
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {words.map((word, index) => {
            const isActive = activeWordIndex === index

            return (
              <motion.button
                key={index}
                onClick={() => handleWordClick(index)}
                style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  borderRadius: borderRadius.lg,
                  border: `2px solid ${isActive ? colors.primary[500] : colors.primary[200]}`,
                  backgroundColor: isActive ? colors.primary[100] : colors.surface,
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.primary[700],
                  cursor: 'pointer',
                  boxShadow: isActive ? shadows.glow : shadows.sm,
                }}
                whileHover={{ scale: 1.05, backgroundColor: colors.primary[100] }}
                whileTap={{ scale: 0.95 }}
                animate={
                  isActive
                    ? {
                        scale: [1, 1.1, 1],
                        transition: { duration: 0.3 },
                      }
                    : {}
                }
              >
                {word}
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          display: 'flex',
          gap: spacing[3],
          width: '100%',
        }}
      >
        <motion.button
          onClick={onPlaySentence}
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
          🔊 שמע משפט
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

export default SentenceReader
