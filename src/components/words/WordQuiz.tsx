import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius } from '../../styles/theme'
import { WordCard } from './WordCard'
import { FeedbackOverlay, type FeedbackType } from '../common/FeedbackOverlay'

export interface WordQuizOption {
  word: string
  syllables: string[]
  isCorrect: boolean
}

export interface WordQuizProps {
  /** The prompt text (e.g., "בחר את המילה שמתאימה לתמונה") */
  prompt: string
  /** Quiz options */
  options: WordQuizOption[]
  /** Called when user selects an option */
  onAnswer: (isCorrect: boolean, selectedOption: WordQuizOption) => void
  /** Called when quiz is complete */
  onComplete: () => void
  /** Called to play the target sound */
  onPlaySound?: () => void
  /** Optional image URL for picture matching */
  imageUrl?: string
  /** Optional translation hint */
  translationHint?: string
}

/**
 * WordQuiz - Quiz for reading and recognizing words
 * Shows options and user selects the correct word
 */
export function WordQuiz({
  prompt,
  options,
  onAnswer,
  onComplete,
  onPlaySound,
  imageUrl,
  translationHint,
}: WordQuizProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [answered, setAnswered] = useState(false)

  // Auto-play sound on mount if available
  useEffect(() => {
    if (onPlaySound) {
      const timer = setTimeout(onPlaySound, 500)
      return () => clearTimeout(timer)
    }
  }, [onPlaySound])

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
      {/* Prompt */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          textAlign: 'center',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.xl,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}
        >
          {prompt}
        </p>
        {translationHint && (
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.lg,
              color: colors.text.secondary,
            }}
          >
            ({translationHint})
          </p>
        )}
      </motion.div>

      {/* Image if provided */}
      {imageUrl && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            width: '150px',
            height: '150px',
            borderRadius: borderRadius.xl,
            overflow: 'hidden',
            backgroundColor: colors.neutral[100],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={imageUrl}
            alt="Word illustration"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </motion.div>
      )}

      {/* Play sound button */}
      {onPlaySound && (
        <motion.button
          onClick={onPlaySound}
          style={{
            padding: `${spacing[3]} ${spacing[6]}`,
            borderRadius: borderRadius.full,
            border: `2px solid ${colors.primary[300]}`,
            backgroundColor: colors.surface,
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.lg,
            color: colors.primary[600],
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🔊 שמע שוב
        </motion.button>
      )}

      {/* Options */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[3],
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {options.map((option, index) => {
          const isSelected = selectedIndex === index
          const showCorrect = feedback === 'success' && isSelected
          const showIncorrect = feedback === 'error' && isSelected

          return (
            <motion.div
              key={`${option.word}-${index}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
              style={{
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <WordCard
                word={option.word}
                syllables={option.syllables}
                size="md"
                selected={isSelected && !showCorrect && !showIncorrect}
                isCorrect={showCorrect}
                isIncorrect={showIncorrect}
                onClick={() => handleOptionClick(index)}
                disabled={answered}
              />
            </motion.div>
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

export default WordQuiz
