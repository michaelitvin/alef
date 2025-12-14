import { useState } from 'react'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'

export interface SyllableBreakdownProps {
  /** The full word */
  word: string
  /** Syllables of the word */
  syllables: string[]
  /** Called when a syllable is clicked */
  onSyllableClick?: (index: number) => void
  /** Called when the full word should be played */
  onPlayWord?: () => void
  /** Called when activity is complete */
  onComplete?: () => void
  /** Whether the activity is in practice mode (can replay) or quiz mode */
  mode?: 'practice' | 'quiz'
}

/**
 * SyllableBreakdown - Interactive syllable practice component
 * User clicks through syllables to build up the word
 */
export function SyllableBreakdown({
  word,
  syllables,
  onSyllableClick,
  onPlayWord,
  onComplete,
  mode = 'practice',
}: SyllableBreakdownProps) {
  const [activeSyllableIndex, setActiveSyllableIndex] = useState(-1)
  const [completedSyllables, setCompletedSyllables] = useState<number[]>([])

  const handleSyllableClick = (index: number) => {
    if (mode === 'quiz' && completedSyllables.includes(index)) return

    setActiveSyllableIndex(index)
    onSyllableClick?.(index)

    if (mode === 'quiz' && !completedSyllables.includes(index)) {
      const newCompleted = [...completedSyllables, index]
      setCompletedSyllables(newCompleted)

      // Check if all syllables are done
      if (newCompleted.length === syllables.length) {
        setTimeout(() => {
          onPlayWord?.()
          setTimeout(() => {
            onComplete?.()
          }, 1000)
        }, 500)
      }
    }
  }

  const handlePlayWord = () => {
    setActiveSyllableIndex(-1)
    onPlayWord?.()
  }

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
      {/* Full word display */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          padding: spacing[4],
          backgroundColor: colors.surface,
          borderRadius: borderRadius['2xl'],
          boxShadow: shadows.lg,
          textAlign: 'center',
        }}
      >
        <motion.span
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['4xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            cursor: 'pointer',
          }}
          onClick={handlePlayWord}
          whileHover={{ scale: 1.05 }}
        >
          {word}
        </motion.span>
      </motion.div>

      {/* Syllables */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: spacing[3],
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {syllables.map((syllable, index) => {
          const isActive = activeSyllableIndex === index
          const isCompleted = completedSyllables.includes(index)

          return (
            <motion.button
              key={index}
              onClick={() => handleSyllableClick(index)}
              style={{
                minWidth: '80px',
                padding: `${spacing[3]} ${spacing[4]}`,
                borderRadius: borderRadius.xl,
                border: `3px solid ${
                  isActive
                    ? colors.primary[500]
                    : isCompleted
                      ? colors.success[400]
                      : colors.neutral[200]
                }`,
                backgroundColor: isActive
                  ? colors.primary[50]
                  : isCompleted
                    ? colors.success[50]
                    : colors.surface,
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.semibold,
                color: isActive
                  ? colors.primary[700]
                  : isCompleted
                    ? colors.success[700]
                    : colors.text.primary,
                cursor: 'pointer',
                boxShadow: isActive ? shadows.glow : shadows.sm,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={
                isActive
                  ? {
                      scale: [1, 1.05, 1],
                      transition: { duration: 0.3 },
                    }
                  : {}
              }
            >
              {syllable}
              {isCompleted && <span style={{ marginRight: spacing[1] }}>✓</span>}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Instructions */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.base,
          color: colors.text.secondary,
          textAlign: 'center',
        }}
      >
        {mode === 'practice'
          ? 'לחץ על כל הברה כדי לשמוע אותה 🔊'
          : `לחץ על ההברות לפי הסדר (${completedSyllables.length}/${syllables.length})`}
      </motion.p>

      {/* Practice mode: continue button */}
      {mode === 'practice' && (
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
            onClick={handlePlayWord}
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
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🔊 שמע מילה שלמה
          </motion.button>

          {onComplete && (
            <motion.button
              onClick={onComplete}
              style={{
                flex: 1,
                padding: `${spacing[3]} ${spacing[4]}`,
                borderRadius: borderRadius.xl,
                border: 'none',
                backgroundColor: colors.primary[500],
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.surface,
                cursor: 'pointer',
              }}
              whileHover={{ scale: 1.02, backgroundColor: colors.primary[600] }}
              whileTap={{ scale: 0.98 }}
            >
              המשך ←
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default SyllableBreakdown
