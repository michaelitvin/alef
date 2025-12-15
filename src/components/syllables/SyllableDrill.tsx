import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { FeedbackOverlay, type FeedbackType } from '../common/FeedbackOverlay'
import type { CVSyllable } from '../../types/entities'

export interface SyllableDrillOption {
  syllable: CVSyllable
  isCorrect: boolean
}

export interface SyllableDrillProps {
  /** The target syllable to identify */
  targetSyllable: CVSyllable
  /** Quiz options (4 syllables including the correct one) */
  options: SyllableDrillOption[]
  /** Called when user selects an option */
  onAnswer: (isCorrect: boolean, selectedOption: SyllableDrillOption) => void
  /** Called when quiz item is complete */
  onComplete: () => void
  /** Called to play the target syllable audio */
  onPlaySound?: () => void
  /** Current item number */
  currentItem?: number
  /** Total items in drill */
  totalItems?: number
}

/**
 * SyllableDrill - CV syllable identification quiz
 * Plays a syllable sound and user selects the matching syllable from 4 options
 */
export function SyllableDrill({
  targetSyllable,
  options,
  onAnswer,
  onComplete,
  onPlaySound,
  currentItem = 1,
  totalItems = 5,
}: SyllableDrillProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [answered, setAnswered] = useState(false)

  // Auto-play sound on mount and when target changes
  useEffect(() => {
    if (onPlaySound) {
      const timer = setTimeout(onPlaySound, 500)
      return () => clearTimeout(timer)
    }
  }, [onPlaySound, targetSyllable.id])

  const handleOptionClick = useCallback(
    (index: number) => {
      if (answered) return

      const option = options[index]
      setSelectedIndex(index)
      setAnswered(true)

      if (option.isCorrect) {
        setFeedback('success')
        setFeedbackVisible(true)
        onAnswer(true, option)
        // Auto-advance after success
        setTimeout(onComplete, 1500)
      } else {
        setFeedback('error')
        setFeedbackVisible(true)
        onAnswer(false, option)
        // Allow retry after showing feedback
        setTimeout(() => {
          setFeedbackVisible(false)
          setFeedback(null)
          setSelectedIndex(null)
          setAnswered(false)
        }, 1200)
      }
    },
    [answered, options, onAnswer, onComplete]
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[6],
        padding: spacing[4],
        position: 'relative',
      }}
    >
      {/* Progress indicator */}
      <div
        style={{
          display: 'flex',
          gap: spacing[1],
          marginBottom: spacing[2],
        }}
      >
        {Array.from({ length: totalItems }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor:
                i < currentItem - 1
                  ? colors.success[400]
                  : i === currentItem - 1
                    ? colors.primary[500]
                    : colors.neutral[300],
            }}
          />
        ))}
      </div>

      {/* Question prompt */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          textAlign: 'center',
          backgroundColor: colors.primary[50],
          padding: spacing[4],
          borderRadius: borderRadius.xl,
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.xl,
            color: colors.primary[700],
            marginBottom: spacing[2],
          }}
        >
          שמע את הצליל ובחר את הצֵרוּף הנכון:
        </p>
      </motion.div>

      {/* Play sound button */}
      <motion.button
        onClick={onPlaySound}
        style={{
          padding: `${spacing[4]} ${spacing[8]}`,
          borderRadius: borderRadius.full,
          border: `2px solid ${colors.primary[300]}`,
          backgroundColor: colors.surface,
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize['2xl'],
          color: colors.primary[600],
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          boxShadow: shadows.md,
        }}
        whileHover={{ scale: 1.05, boxShadow: shadows.lg }}
        whileTap={{ scale: 0.95 }}
      >
        🔊 שמע שוב
      </motion.button>

      {/* Options grid - 2x2 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: spacing[4],
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {options.map((option, index) => {
          const isSelected = selectedIndex === index
          const showCorrect = feedback === 'success' && isSelected
          const showIncorrect = feedback === 'error' && isSelected

          return (
            <motion.button
              key={`${option.syllable.id}-${index}`}
              onClick={() => handleOptionClick(index)}
              disabled={answered}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
              style={{
                width: '100%',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: showCorrect
                  ? colors.success[100]
                  : showIncorrect
                    ? colors.error[100]
                    : isSelected
                      ? colors.primary[100]
                      : colors.surface,
                borderRadius: borderRadius['2xl'],
                border: `3px solid ${
                  showCorrect
                    ? colors.success[500]
                    : showIncorrect
                      ? colors.error[400]
                      : isSelected
                        ? colors.primary[500]
                        : 'transparent'
                }`,
                boxShadow: shadows.md,
                cursor: answered ? 'not-allowed' : 'pointer',
                opacity: answered && !isSelected ? 0.6 : 1,
              }}
              whileHover={answered ? {} : { scale: 1.05 }}
              whileTap={answered ? {} : { scale: 0.95 }}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: '4rem',
                  lineHeight: 1,
                  color: colors.text.primary,
                }}
              >
                {option.syllable.display}
              </span>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Feedback overlay */}
      <FeedbackOverlay
        visible={feedbackVisible}
        type={feedback || 'success'}
        message={
          feedback === 'success'
            ? ['כל הכבוד!', 'מעולה!', 'נכון!'][Math.floor(Math.random() * 3)]
            : ['נסה שוב', 'לא נכון'][Math.floor(Math.random() * 2)]
        }
        onHide={() => setFeedbackVisible(false)}
      />
    </div>
  )
}

export default SyllableDrill
