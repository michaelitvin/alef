import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { FeedbackOverlay, type FeedbackType } from '../common/FeedbackOverlay'

export interface ComprehensionOption {
  text: string
  isCorrect: boolean
}

export interface ComprehensionQuizProps {
  /** The sentence that was read */
  sentence: string
  /** The comprehension question */
  question: string
  /** Answer options */
  options: ComprehensionOption[]
  /** Called when user selects an option */
  onAnswer: (isCorrect: boolean, selectedOption: ComprehensionOption) => void
  /** Called when quiz is complete */
  onComplete: () => void
  /** Called to play the sentence audio */
  onPlaySentence?: () => void
}

/**
 * ComprehensionQuiz - Tests understanding of a sentence
 * Asks a question about the sentence with multiple choice answers
 */
export function ComprehensionQuiz({
  sentence,
  question,
  options,
  onAnswer,
  onComplete,
  onPlaySentence,
}: ComprehensionQuizProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [answered, setAnswered] = useState(false)

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
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      {/* Sentence context */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          padding: spacing[4],
          backgroundColor: colors.neutral[50],
          borderRadius: borderRadius.xl,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <motion.p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.xl,
            color: colors.text.primary,
            direction: 'rtl',
            cursor: 'pointer',
          }}
          onClick={onPlaySentence}
          whileHover={{ scale: 1.02 }}
        >
          {sentence} 🔊
        </motion.p>
      </motion.div>

      {/* Question */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          padding: spacing[4],
          backgroundColor: colors.primary[50],
          borderRadius: borderRadius.xl,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[700],
            direction: 'rtl',
          }}
        >
          {question}
        </p>
      </motion.div>

      {/* Options */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[3],
          width: '100%',
        }}
      >
        {options.map((option, index) => {
          const isSelected = selectedIndex === index
          const showCorrect = feedback === 'success' && isSelected
          const showIncorrect = feedback === 'error' && isSelected

          return (
            <motion.button
              key={index}
              onClick={() => handleOptionClick(index)}
              disabled={answered}
              style={{
                padding: spacing[4],
                borderRadius: borderRadius.xl,
                border: `3px solid ${
                  showCorrect
                    ? colors.success[500]
                    : showIncorrect
                      ? colors.error[400]
                      : isSelected
                        ? colors.primary[500]
                        : colors.neutral[200]
                }`,
                backgroundColor: showCorrect
                  ? colors.success[50]
                  : showIncorrect
                    ? colors.error[50]
                    : isSelected
                      ? colors.primary[50]
                      : colors.surface,
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: showCorrect
                  ? colors.success[700]
                  : showIncorrect
                    ? colors.error[700]
                    : colors.text.primary,
                cursor: answered ? 'not-allowed' : 'pointer',
                opacity: answered && !isSelected ? 0.5 : 1,
                boxShadow: isSelected && !showCorrect && !showIncorrect ? shadows.glow : shadows.sm,
                direction: 'rtl',
              }}
              whileHover={answered ? {} : { scale: 1.02 }}
              whileTap={answered ? {} : { scale: 0.98 }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
            >
              {option.text}
              {showCorrect && ' ✓'}
              {showIncorrect && ' ✗'}
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

export default ComprehensionQuiz
