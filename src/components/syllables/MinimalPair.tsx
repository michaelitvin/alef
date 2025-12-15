import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { FeedbackOverlay, type FeedbackType } from '../common/FeedbackOverlay'

export interface PairSyllable {
  id: string
  display: string
  sound: string
}

export interface MinimalPairData {
  id: string
  syllable1: PairSyllable
  syllable2: PairSyllable
  contrastType: 'consonant' | 'vowel' | 'dagesh' | 'shin-sin'
  contrastDescription: string
}

export interface MinimalPairProps {
  /** The minimal pair to practice */
  pair: MinimalPairData
  /** Called when item is complete */
  onComplete: (correctCount: number, totalCount: number) => void
  /** Called to play syllable audio */
  onPlaySyllable?: (syllable: PairSyllable) => void
  /** Current item number */
  currentItem?: number
  /** Total items */
  totalItems?: number
}

/**
 * MinimalPair - Discriminate between similar-sounding syllables
 * Audio plays, child selects which syllable they heard
 */
export function MinimalPair({
  pair,
  onComplete,
  onPlaySyllable,
  currentItem = 1,
  totalItems = 5,
}: MinimalPairProps) {
  const [round, setRound] = useState(0)
  const [targetSyllable, setTargetSyllable] = useState<PairSyllable | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [answered, setAnswered] = useState(false)

  const totalRounds = 4 // 4 rounds per pair

  // Initialize round with random target
  useEffect(() => {
    const target = Math.random() < 0.5 ? pair.syllable1 : pair.syllable2
    setTargetSyllable(target)
    setSelectedId(null)
    setAnswered(false)
    setFeedback(null)
    setFeedbackVisible(false)

    // Auto-play after short delay
    if (onPlaySyllable) {
      setTimeout(() => onPlaySyllable(target), 600)
    }
  }, [pair.id, round, onPlaySyllable, pair.syllable1, pair.syllable2])

  const handlePlayAgain = useCallback(() => {
    if (targetSyllable && onPlaySyllable) {
      onPlaySyllable(targetSyllable)
    }
  }, [targetSyllable, onPlaySyllable])

  const handleSelect = useCallback(
    (syllable: PairSyllable) => {
      if (answered || !targetSyllable) return

      setSelectedId(syllable.id)
      setAnswered(true)

      const isCorrect = syllable.id === targetSyllable.id

      if (isCorrect) {
        setCorrectCount((prev) => prev + 1)
        setFeedback('success')
      } else {
        setFeedback('error')
      }
      setFeedbackVisible(true)

      // Move to next round or complete
      setTimeout(() => {
        setFeedbackVisible(false)
        if (round < totalRounds - 1) {
          setRound((prev) => prev + 1)
        } else {
          onComplete(correctCount + (isCorrect ? 1 : 0), totalRounds)
        }
      }, 1500)
    },
    [answered, targetSyllable, round, totalRounds, correctCount, onComplete]
  )

  const syllables = [pair.syllable1, pair.syllable2]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[5],
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

      {/* Round progress within pair */}
      <div
        style={{
          display: 'flex',
          gap: spacing[2],
          marginBottom: spacing[2],
        }}
      >
        {Array.from({ length: totalRounds }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor:
                i < round
                  ? colors.secondary[400]
                  : i === round
                    ? colors.secondary[600]
                    : colors.neutral[200],
              border: i === round ? `2px solid ${colors.secondary[700]}` : 'none',
            }}
          />
        ))}
      </div>

      {/* Instructions */}
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
          }}
        >
          שמע ובחר את הצֵרוּף הנכון:
        </p>
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.base,
            color: colors.primary[500],
            marginTop: spacing[1],
          }}
        >
          {pair.contrastDescription}
        </p>
      </motion.div>

      {/* Play sound button */}
      <motion.button
        onClick={handlePlayAgain}
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
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: answered ? 0 : Infinity,
          repeatDelay: 2,
        }}
      >
        🔊 שמע
      </motion.button>

      {/* Options - two large buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          display: 'flex',
          gap: spacing[6],
          justifyContent: 'center',
        }}
      >
        {syllables.map((syllable, index) => {
          const isSelected = selectedId === syllable.id
          const isCorrectAnswer = answered && targetSyllable?.id === syllable.id
          const isWrongSelection = isSelected && !isCorrectAnswer

          return (
            <motion.button
              key={syllable.id}
              onClick={() => handleSelect(syllable)}
              disabled={answered}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
              style={{
                width: '140px',
                height: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCorrectAnswer
                  ? colors.success[100]
                  : isWrongSelection
                    ? colors.error[100]
                    : colors.surface,
                borderRadius: borderRadius['2xl'],
                border: `4px solid ${
                  isCorrectAnswer
                    ? colors.success[500]
                    : isWrongSelection
                      ? colors.error[400]
                      : colors.neutral[200]
                }`,
                boxShadow: shadows.lg,
                cursor: answered ? 'not-allowed' : 'pointer',
              }}
              whileHover={answered ? {} : { scale: 1.08 }}
              whileTap={answered ? {} : { scale: 0.95 }}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: '4.5rem',
                  lineHeight: 1,
                  color: isCorrectAnswer
                    ? colors.success[700]
                    : isWrongSelection
                      ? colors.error[600]
                      : colors.text.primary,
                }}
              >
                {syllable.display}
              </span>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Score */}
      <p
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.lg,
          color: colors.text.secondary,
        }}
      >
        {correctCount} / {round + (answered ? 1 : 0)} נכונים
      </p>

      {/* Feedback overlay */}
      <FeedbackOverlay
        visible={feedbackVisible}
        type={feedback || 'success'}
        message={
          feedback === 'success'
            ? ['נכון!', 'מעולה!', 'יופי!'][Math.floor(Math.random() * 3)]
            : 'לא נכון'
        }
        onHide={() => setFeedbackVisible(false)}
      />
    </div>
  )
}

export default MinimalPair
