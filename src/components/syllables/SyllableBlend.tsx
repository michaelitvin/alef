import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { FeedbackOverlay, type FeedbackType } from '../common/FeedbackOverlay'
import { useSoundEffects } from '../../hooks/useAudio'

export interface BlendSyllable {
  id: string
  display: string
  sound: string
}

export interface BlendWord {
  id: string
  syllables: BlendSyllable[]
  word: string
  wordSound: string
}

export interface SyllableBlendProps {
  /** The word to blend */
  blendWord: BlendWord
  /** Called when blend is complete */
  onComplete: () => void
  /** Called to play syllable audio */
  onPlaySyllable?: (syllable: BlendSyllable) => void
  /** Called to play full word audio */
  onPlayWord?: () => void
  /** Current item number */
  currentItem?: number
  /** Total items */
  totalItems?: number
}

/**
 * SyllableBlend - Blend CV syllables into words
 * Child taps syllables in order, then hears/sees the blended word
 */
export function SyllableBlend({
  blendWord,
  onComplete,
  onPlaySyllable,
  onPlayWord,
  currentItem = 1,
  totalItems = 5,
}: SyllableBlendProps) {
  const [tappedIndices, setTappedIndices] = useState<number[]>([])
  const [showBlended, setShowBlended] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const { playSuccess, playError } = useSoundEffects()

  const allTapped = tappedIndices.length === blendWord.syllables.length

  // Reset state when blendWord changes
  useEffect(() => {
    setTappedIndices([])
    setShowBlended(false)
    setFeedback(null)
    setFeedbackVisible(false)
  }, [blendWord.id])

  // When all syllables tapped, show blended word
  useEffect(() => {
    if (allTapped && !showBlended) {
      setTimeout(() => {
        setShowBlended(true)
        if (onPlayWord) {
          setTimeout(onPlayWord, 300)
        }
        setFeedback('success')
        setFeedbackVisible(true)
        playSuccess()
        // Auto-advance after showing word
        setTimeout(onComplete, 2500)
      }, 500)
    }
  }, [allTapped, showBlended, onPlayWord, onComplete, playSuccess])

  const handleSyllableTap = useCallback(
    (index: number) => {
      if (tappedIndices.includes(index) || showBlended) return

      // Must tap in order
      const expectedIndex = tappedIndices.length
      if (index !== expectedIndex) {
        // Wrong order - show hint
        setFeedback('error')
        setFeedbackVisible(true)
        playError()
        setTimeout(() => {
          setFeedbackVisible(false)
          setFeedback(null)
        }, 800)
        return
      }

      // Correct order
      setTappedIndices([...tappedIndices, index])
      if (onPlaySyllable) {
        onPlaySyllable(blendWord.syllables[index])
      }
    },
    [tappedIndices, showBlended, onPlaySyllable, blendWord.syllables]
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
          {showBlended ? 'כל הכבוד! קראת:' : 'לחץ על הצֵרוּפִים לפי הסדר:'}
        </p>
      </motion.div>

      {/* Syllables row */}
      <AnimatePresence mode="wait">
        {!showBlended ? (
          <motion.div
            key="syllables"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              display: 'flex',
              gap: spacing[4],
              justifyContent: 'center',
              direction: 'rtl',
            }}
          >
            {blendWord.syllables.map((syllable, index) => {
              const isTapped = tappedIndices.includes(index)
              const isNext = index === tappedIndices.length

              return (
                <motion.button
                  key={syllable.id}
                  onClick={() => handleSyllableTap(index)}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 * index }}
                  style={{
                    width: '100px',
                    height: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isTapped
                      ? colors.success[100]
                      : isNext
                        ? colors.primary[50]
                        : colors.surface,
                    borderRadius: borderRadius['2xl'],
                    border: `3px solid ${
                      isTapped
                        ? colors.success[500]
                        : isNext
                          ? colors.primary[400]
                          : colors.neutral[200]
                    }`,
                    boxShadow: isNext ? shadows.lg : shadows.md,
                    cursor: isTapped ? 'default' : 'pointer',
                  }}
                  whileHover={isTapped ? {} : { scale: 1.05 }}
                  whileTap={isTapped ? {} : { scale: 0.95 }}
                >
                  <span
                    style={{
                      fontFamily: typography.fontFamily.hebrew,
                      fontSize: '3.5rem',
                      lineHeight: 1,
                      color: isTapped ? colors.success[700] : colors.text.primary,
                    }}
                  >
                    {syllable.display}
                  </span>
                </motion.button>
              )
            })}
          </motion.div>
        ) : (
          <motion.div
            key="word"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={{
              backgroundColor: colors.success[50],
              padding: `${spacing[6]} ${spacing[8]}`,
              borderRadius: borderRadius['2xl'],
              boxShadow: shadows.lg,
            }}
          >
            <span
              style={{
                fontFamily: typography.fontFamily.hebrew,
                fontSize: '5rem',
                lineHeight: 1,
                color: colors.success[700],
              }}
            >
              {blendWord.word}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arrow showing blend direction */}
      {!showBlended && tappedIndices.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            color: colors.primary[500],
          }}
        >
          <span style={{ fontSize: '2rem' }}>←</span>
          <span
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.lg,
            }}
          >
            המשך לחיץ
          </span>
        </motion.div>
      )}

      {/* Play word button (after blend) */}
      {showBlended && (
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={onPlayWord}
          style={{
            padding: `${spacing[3]} ${spacing[6]}`,
            borderRadius: borderRadius.full,
            border: `2px solid ${colors.success[300]}`,
            backgroundColor: colors.surface,
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.xl,
            color: colors.success[600],
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

      {/* Feedback overlay */}
      <FeedbackOverlay
        visible={feedbackVisible}
        type={feedback || 'success'}
        message={
          feedback === 'success'
            ? ['מעולה!', 'כל הכבוד!', 'יופי!'][Math.floor(Math.random() * 3)]
            : 'לחץ לפי הסדר מימין לשמאל'
        }
        onHide={() => setFeedbackVisible(false)}
      />
    </div>
  )
}

export default SyllableBlend
