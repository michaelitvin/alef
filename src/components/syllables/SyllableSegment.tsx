import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { FeedbackOverlay, type FeedbackType } from '../common/FeedbackOverlay'
import { useSoundEffects } from '../../hooks/useAudio'

export interface SegmentSyllable {
  id: string
  display: string
  sound: string
}

export interface SegmentWord {
  id: string
  word: string
  wordSound: string
  syllables: SegmentSyllable[]
}

export interface SyllableSegmentProps {
  /** The word to segment */
  segmentWord: SegmentWord
  /** All available syllable options */
  options: SegmentSyllable[]
  /** Called when segmentation is complete */
  onComplete: (isCorrect: boolean) => void
  /** Called to play word audio */
  onPlayWord?: () => void
  /** Called to play syllable audio */
  onPlaySyllable?: (syllable: SegmentSyllable) => void
  /** Current item number */
  currentItem?: number
  /** Total items */
  totalItems?: number
}

/**
 * SyllableSegment - Break words into CV syllables
 * Child hears word, then selects syllables that make up the word in order
 */
export function SyllableSegment({
  segmentWord,
  options,
  onComplete,
  onPlayWord,
  onPlaySyllable,
  currentItem = 1,
  totalItems = 5,
}: SyllableSegmentProps) {
  const [selectedSyllables, setSelectedSyllables] = useState<SegmentSyllable[]>([])
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const { playSuccess, playError } = useSoundEffects()

  const expectedCount = segmentWord.syllables.length

  // Reset state when word changes
  useEffect(() => {
    setSelectedSyllables([])
    setFeedback(null)
    setFeedbackVisible(false)
    setIsComplete(false)
    // Auto-play word on mount
    setTimeout(() => onPlayWord?.(), 500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentWord.id])

  // Check if selection matches
  useEffect(() => {
    if (selectedSyllables.length === expectedCount && !isComplete) {
      const isCorrect = selectedSyllables.every(
        (s, i) => s.id === segmentWord.syllables[i].id
      )

      if (isCorrect) {
        setFeedback('success')
        setFeedbackVisible(true)
        playSuccess()
        setIsComplete(true)
        setTimeout(() => onComplete(true), 2000)
      } else {
        setFeedback('error')
        setFeedbackVisible(true)
        playError()
        // Reset after showing error
        setTimeout(() => {
          setSelectedSyllables([])
          setFeedbackVisible(false)
          setFeedback(null)
        }, 1500)
      }
    }
  }, [selectedSyllables, expectedCount, segmentWord.syllables, isComplete, onComplete, playSuccess, playError])

  const handleOptionClick = useCallback(
    (syllable: SegmentSyllable) => {
      if (isComplete || selectedSyllables.length >= expectedCount) return

      setSelectedSyllables([...selectedSyllables, syllable])
      if (onPlaySyllable) {
        onPlaySyllable(syllable)
      }
    },
    [selectedSyllables, expectedCount, isComplete, onPlaySyllable]
  )

  const handleRemoveLast = useCallback(() => {
    if (selectedSyllables.length > 0 && !isComplete) {
      setSelectedSyllables(selectedSyllables.slice(0, -1))
    }
  }, [selectedSyllables, isComplete])

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

      {/* Word to segment */}
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
            fontSize: typography.fontSize.lg,
            color: colors.secondary[700],
            marginBottom: spacing[2],
          }}
        >
          פרק את המילה לצֵרוּפִים:
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <span
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: '3.5rem',
              lineHeight: 1,
              color: colors.secondary[800],
            }}
          >
            {segmentWord.word}
          </span>
          <motion.button
            onClick={onPlayWord}
            style={{
              padding: spacing[2],
              borderRadius: borderRadius.full,
              border: 'none',
              backgroundColor: colors.secondary[100],
              cursor: 'pointer',
              fontSize: '1.5rem',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            🔊
          </motion.button>
        </div>
      </motion.div>

      {/* Selected syllables area */}
      <div
        style={{
          display: 'flex',
          gap: spacing[2],
          minHeight: '80px',
          padding: spacing[3],
          backgroundColor: colors.neutral[50],
          borderRadius: borderRadius.xl,
          border: `2px dashed ${colors.neutral[300]}`,
          width: '100%',
          maxWidth: '400px',
          justifyContent: 'center',
          alignItems: 'center',
          direction: 'rtl',
        }}
      >
        {selectedSyllables.length === 0 ? (
          <span
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.lg,
              color: colors.text.disabled,
            }}
          >
            בחר צֵרוּפִים...
          </span>
        ) : (
          <>
            {selectedSyllables.map((syllable, index) => (
              <motion.div
                key={`selected-${index}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  backgroundColor: isComplete ? colors.success[100] : colors.primary[100],
                  borderRadius: borderRadius.lg,
                  border: `2px solid ${isComplete ? colors.success[400] : colors.primary[400]}`,
                }}
              >
                <span
                  style={{
                    fontFamily: typography.fontFamily.hebrew,
                    fontSize: '2rem',
                    color: isComplete ? colors.success[700] : colors.primary[700],
                  }}
                >
                  {syllable.display}
                </span>
              </motion.div>
            ))}
            {!isComplete && selectedSyllables.length > 0 && (
              <motion.button
                onClick={handleRemoveLast}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  padding: spacing[2],
                  borderRadius: borderRadius.lg,
                  border: 'none',
                  backgroundColor: colors.error[100],
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ↩️
              </motion.button>
            )}
          </>
        )}
      </div>

      {/* Syllable count hint */}
      <p
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.base,
          color: colors.text.secondary,
        }}
      >
        {expectedCount} צֵרוּפִים במילה
      </p>

      {/* Options grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: spacing[3],
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {options.map((option, index) => (
          <motion.button
            key={option.id}
            onClick={() => handleOptionClick(option)}
            disabled={isComplete}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05 * index }}
            style={{
              padding: spacing[3],
              backgroundColor: colors.surface,
              borderRadius: borderRadius.xl,
              border: `2px solid ${colors.neutral[200]}`,
              boxShadow: shadows.sm,
              cursor: isComplete ? 'not-allowed' : 'pointer',
              opacity: isComplete ? 0.6 : 1,
            }}
            whileHover={isComplete ? {} : { scale: 1.05, borderColor: colors.primary[400] }}
            whileTap={isComplete ? {} : { scale: 0.95 }}
          >
            <span
              style={{
                fontFamily: typography.fontFamily.hebrew,
                fontSize: '2.5rem',
                lineHeight: 1,
                color: colors.text.primary,
              }}
            >
              {option.display}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Feedback overlay */}
      <FeedbackOverlay
        visible={feedbackVisible}
        type={feedback || 'success'}
        message={
          feedback === 'success'
            ? ['מעולה!', 'נכון!', 'כל הכבוד!'][Math.floor(Math.random() * 3)]
            : 'נסה שוב'
        }
        onHide={() => setFeedbackVisible(false)}
      />
    </div>
  )
}

export default SyllableSegment
