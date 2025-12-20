import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius } from '../../styles/theme'
import { NikkudCard } from './NikkudCard'
import { FeedbackOverlay, type FeedbackType } from '../common/FeedbackOverlay'
import { useSoundEffects } from '../../hooks/useAudio'

export interface NikkudQuizOption {
  letter: string
  nikkud: string
  isCorrect: boolean
}

export interface NikkudQuizProps {
  /** The target sound to match */
  targetSound: string
  /** The nikkud name being quizzed */
  nikkudName: string
  /** Quiz options (letter+nikkud combinations) */
  options: NikkudQuizOption[]
  /** Called when user selects an option */
  onAnswer: (isCorrect: boolean, selectedOption: NikkudQuizOption) => void
  /** Called when quiz is complete */
  onComplete: () => void
  /** Called to play the target sound */
  onPlaySound?: () => void
}

/**
 * NikkudQuiz - Quiz for identifying nikkud combinations
 * Shows multiple letter+nikkud combinations, user selects the one that makes the target sound
 */
export function NikkudQuiz({
  options,
  onAnswer,
  onComplete,
  onPlaySound,
}: NikkudQuizProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [answered, setAnswered] = useState(false)
  const { playSuccess, playError } = useSoundEffects()

  // Auto-play sound on mount (immediately)
  useEffect(() => {
    onPlaySound?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleOptionClick = useCallback(
    (index: number) => {
      if (answered) return

      const option = options[index]
      setSelectedIndex(index)
      setAnswered(true)

      if (option.isCorrect) {
        setFeedback('success')
        setFeedbackVisible(true)
        playSuccess()
        onAnswer(true, option)
        // Auto-advance after success
        setTimeout(onComplete, 1500)
      } else {
        setFeedback('error')
        setFeedbackVisible(true)
        playError()
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
    [answered, options, onAnswer, onComplete, playSuccess, playError]
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
      {/* Question prompt */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          textAlign: 'center',
          backgroundColor: colors.secondary[50],
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
            color: colors.secondary[700],
          }}
        >
          שמע ומצא את הצליל הנכון
        </p>
      </motion.div>

      {/* Play sound button */}
      <motion.button
        onClick={onPlaySound}
        style={{
          padding: `${spacing[3]} ${spacing[6]}`,
          borderRadius: borderRadius.full,
          border: `2px solid ${colors.secondary[300]}`,
          backgroundColor: colors.surface,
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.lg,
          color: colors.secondary[600],
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

      {/* Options grid */}
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
            <motion.div
              key={`${option.letter}-${option.nikkud}-${index}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
              style={{
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <NikkudCard
                letter={option.letter}
                nikkud={option.nikkud}
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

export default NikkudQuiz
