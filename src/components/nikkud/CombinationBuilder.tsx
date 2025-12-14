import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { LetterCard } from '../letters/LetterCard'
import { FeedbackOverlay, type FeedbackType } from '../common/FeedbackOverlay'

export interface CombinationBuilderProps {
  /** Available letters to choose from */
  letters: string[]
  /** Available nikkud marks to choose from */
  nikkudOptions: Array<{ mark: string; name: string }>
  /** The target combination to build */
  targetLetter: string
  targetNikkud: string
  targetSound: string
  /** Called when correct combination is built */
  onCorrect: () => void
  /** Called when incorrect combination is attempted */
  onIncorrect: () => void
  /** Called to play the target sound */
  onPlaySound?: () => void
}

/**
 * CombinationBuilder - Interactive activity to build letter+nikkud combinations
 * User selects a letter and a nikkud to match the target sound
 */
export function CombinationBuilder({
  letters,
  nikkudOptions,
  targetLetter,
  targetNikkud,
  targetSound,
  onCorrect,
  onIncorrect,
  onPlaySound,
}: CombinationBuilderProps) {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [selectedNikkud, setSelectedNikkud] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [checking, setChecking] = useState(false)

  const handleCheck = useCallback(() => {
    if (!selectedLetter || !selectedNikkud || checking) return

    setChecking(true)

    const isCorrect =
      selectedLetter === targetLetter && selectedNikkud === targetNikkud

    if (isCorrect) {
      setFeedback('success')
      setFeedbackVisible(true)
      onCorrect()
      // Keep showing success for a moment
      setTimeout(() => {
        setFeedbackVisible(false)
        setFeedback(null)
        setChecking(false)
      }, 2000)
    } else {
      setFeedback('error')
      setFeedbackVisible(true)
      onIncorrect()
      // Reset after showing feedback
      setTimeout(() => {
        setFeedbackVisible(false)
        setFeedback(null)
        setSelectedLetter(null)
        setSelectedNikkud(null)
        setChecking(false)
      }, 1500)
    }
  }, [
    selectedLetter,
    selectedNikkud,
    checking,
    targetLetter,
    targetNikkud,
    onCorrect,
    onIncorrect,
  ])

  const combination =
    selectedLetter && selectedNikkud
      ? `${selectedLetter}${selectedNikkud}`
      : selectedLetter || '?'

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
      {/* Target sound prompt */}
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
            fontSize: typography.fontSize.lg,
            color: colors.primary[700],
            marginBottom: spacing[2],
          }}
        >
          בנה את הצליל:
        </p>
        <motion.p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[600],
            cursor: 'pointer',
          }}
          onClick={onPlaySound}
          whileHover={{ scale: 1.05 }}
        >
          {targetSound} 🔊
        </motion.p>
      </motion.div>

      {/* Current combination preview */}
      <motion.div
        style={{
          width: '140px',
          height: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          borderRadius: borderRadius['2xl'],
          border: `3px solid ${
            feedback === 'success'
              ? colors.success[500]
              : feedback === 'error'
                ? colors.error[400]
                : colors.primary[300]
          }`,
          boxShadow: shadows.lg,
        }}
        animate={
          feedback === 'success'
            ? { scale: [1, 1.1, 1] }
            : feedback === 'error'
              ? { x: [0, -10, 10, -10, 10, 0] }
              : {}
        }
      >
        <span
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: '5rem',
            lineHeight: 1,
            color:
              selectedLetter && selectedNikkud
                ? colors.text.primary
                : colors.text.disabled,
          }}
        >
          {combination}
        </span>
      </motion.div>

      {/* Letter selection */}
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            textAlign: 'center',
            marginBottom: spacing[3],
          }}
        >
          בחר אות:
        </p>
        <div
          style={{
            display: 'flex',
            gap: spacing[2],
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {letters.map((letter) => (
            <LetterCard
              key={letter}
              letter={letter}
              size="sm"
              selected={selectedLetter === letter}
              onClick={() => setSelectedLetter(letter)}
              disabled={checking}
            />
          ))}
        </div>
      </div>

      {/* Nikkud selection */}
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            textAlign: 'center',
            marginBottom: spacing[3],
          }}
        >
          בחר ניקוד:
        </p>
        <div
          style={{
            display: 'flex',
            gap: spacing[2],
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {nikkudOptions.map(({ mark, name }) => (
            <motion.button
              key={mark}
              onClick={() => setSelectedNikkud(mark)}
              disabled={checking}
              style={{
                width: '70px',
                height: '70px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  selectedNikkud === mark ? colors.secondary[100] : colors.surface,
                borderRadius: borderRadius.xl,
                border: `2px solid ${
                  selectedNikkud === mark
                    ? colors.secondary[500]
                    : colors.neutral[200]
                }`,
                cursor: checking ? 'not-allowed' : 'pointer',
                opacity: checking ? 0.6 : 1,
              }}
              whileHover={checking ? {} : { scale: 1.05 }}
              whileTap={checking ? {} : { scale: 0.95 }}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: '1.5rem',
                  color: colors.text.primary,
                }}
              >
                א{mark}
              </span>
              <span
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize.xs,
                  color: colors.text.secondary,
                }}
              >
                {name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Check button */}
      <motion.button
        onClick={handleCheck}
        disabled={!selectedLetter || !selectedNikkud || checking}
        style={{
          padding: `${spacing[3]} ${spacing[8]}`,
          borderRadius: borderRadius.xl,
          border: 'none',
          backgroundColor:
            selectedLetter && selectedNikkud
              ? colors.primary[500]
              : colors.neutral[300],
          boxShadow: selectedLetter && selectedNikkud ? shadows.md : 'none',
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: colors.surface,
          cursor:
            selectedLetter && selectedNikkud && !checking
              ? 'pointer'
              : 'not-allowed',
          opacity: checking ? 0.6 : 1,
        }}
        whileHover={
          selectedLetter && selectedNikkud && !checking ? { scale: 1.02 } : {}
        }
        whileTap={
          selectedLetter && selectedNikkud && !checking ? { scale: 0.98 } : {}
        }
      >
        בדוק ✓
      </motion.button>

      {/* Feedback overlay */}
      <FeedbackOverlay
        visible={feedbackVisible}
        type={feedback || 'success'}
        message={
          feedback === 'success'
            ? ['מצוין!', 'כל הכבוד!', 'נהדר!'][Math.floor(Math.random() * 3)]
            : ['נסה שוב', 'כמעט!'][Math.floor(Math.random() * 2)]
        }
        onHide={() => setFeedbackVisible(false)}
      />
    </div>
  )
}

export default CombinationBuilder
