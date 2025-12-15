import { motion } from 'framer-motion'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { LetterCard } from './LetterCard'
import { Button } from '../common/Button'
import { FeedbackOverlay } from '../common/FeedbackOverlay'
import { useAudio, useSoundEffects } from '../../hooks/useAudio'
import { getLetterNameAudio, preloadLetterNamesByIds } from '../../utils/audio'
import type { Letter } from '../../types/entities'

export interface LetterMatchProps {
  /** Array of letters to match */
  letters: Letter[]
  /** Called when a match attempt is made */
  onMatch: (correct: boolean, letterId: string) => void
  /** Called when all pairs are matched */
  onComplete: () => void
  /** Number of pairs to show (default: all) */
  pairCount?: number
}

interface MatchItem {
  id: string
  type: 'letter' | 'sound'
  letterId: string
  display: string
  matched: boolean
}

type MatchState = 'selecting' | 'checking' | 'correct' | 'incorrect' | 'complete'

/**
 * LetterMatch - Match letters to their sounds
 * Shows letters on one side and sound buttons on the other
 */
export function LetterMatch({
  letters,
  onMatch,
  onComplete,
  pairCount,
}: LetterMatchProps) {
  const count = pairCount || letters.length
  const selectedLetters = useMemo(
    () => letters.slice(0, count),
    [letters, count]
  )

  // Create shuffled items for matching
  const [items, setItems] = useState<MatchItem[]>(() => {
    const letterItems: MatchItem[] = selectedLetters.map((letter) => ({
      id: `letter-${letter.id}`,
      type: 'letter',
      letterId: letter.id,
      display: letter.character,
      matched: false,
    }))

    const soundItems: MatchItem[] = selectedLetters.map((letter) => ({
      id: `sound-${letter.id}`,
      type: 'sound',
      letterId: letter.id,
      display: letter.name,
      matched: false,
    }))

    // Shuffle each side independently
    return [
      ...shuffleArray(letterItems),
      ...shuffleArray(soundItems),
    ]
  })

  const [state, setState] = useState<MatchState>('selecting')
  const [selectedLetter, setSelectedLetter] = useState<MatchItem | null>(null)
  const [selectedSound, setSelectedSound] = useState<MatchItem | null>(null)
  const [matchedPairs, setMatchedPairs] = useState<string[]>([])

  const { play } = useAudio()
  const { playSuccess, playError } = useSoundEffects()

  // Preload audio for all letters on mount
  useEffect(() => {
    const letterIds = selectedLetters.map(l => l.id)
    preloadLetterNamesByIds(letterIds)
  }, [selectedLetters])

  // Check for match when both items are selected
  useEffect(() => {
    if (selectedLetter && selectedSound && state === 'selecting') {
      setState('checking')

      const isMatch = selectedLetter.letterId === selectedSound.letterId

      if (isMatch) {
        setTimeout(() => {
          setState('correct')
          playSuccess().catch(console.error)
          onMatch(true, selectedLetter.letterId)

          // Mark items as matched
          setItems((prev) =>
            prev.map((item) =>
              item.letterId === selectedLetter.letterId
                ? { ...item, matched: true }
                : item
            )
          )
          setMatchedPairs((prev) => [...prev, selectedLetter.letterId])

          // Reset selection after animation
          setTimeout(() => {
            setSelectedLetter(null)
            setSelectedSound(null)
            setState('selecting')

            // Check if all matched
            if (matchedPairs.length + 1 === selectedLetters.length) {
              setState('complete')
            }
          }, 800)
        }, 300)
      } else {
        setTimeout(() => {
          setState('incorrect')
          playError().catch(console.error)
          onMatch(false, selectedLetter.letterId)

          // Reset selection after shake animation
          setTimeout(() => {
            setSelectedLetter(null)
            setSelectedSound(null)
            setState('selecting')
          }, 800)
        }, 300)
      }
    }
  }, [selectedLetter, selectedSound, state, matchedPairs.length, selectedLetters.length, onMatch, playSuccess, playError])

  const handleLetterClick = useCallback(
    (item: MatchItem) => {
      if (state !== 'selecting' || item.matched || !selectedSound) return

      setSelectedLetter(item)
    },
    [state, selectedSound]
  )

  const handleSoundClick = useCallback(
    (item: MatchItem) => {
      if (state !== 'selecting' || item.matched) return

      // Play the letter name audio
      play(getLetterNameAudio(item.letterId)).catch(console.error)

      setSelectedSound(item)
    },
    [state, play]
  )

  const letterItems = items.filter((item) => item.type === 'letter')
  const soundItems = items.filter((item) => item.type === 'sound')

  if (state === 'complete') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[6],
          padding: spacing[4],
          minHeight: '60vh',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          style={{
            fontSize: '4rem',
          }}
        >
          🎉
        </motion.div>
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['2xl'],
            color: colors.primary[600],
            textAlign: 'center',
          }}
        >
          מצוין! התאמת את כל האותיות!
        </p>
        <Button variant="primary" size="lg" onClick={onComplete}>
          המשך ←
        </Button>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[6],
        padding: spacing[4],
      }}
    >
      {/* Instructions */}
      <p
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.xl,
          color: colors.text.primary,
          textAlign: 'center',
        }}
      >
        {selectedSound ? 'עכשיו בחר את האות' : 'לחץ על צליל לשמוע'}
      </p>

      {/* Matching area - stacked rows */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[6],
          alignItems: 'center',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {/* Sound buttons row (step 1) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing[3],
            justifyContent: 'center',
          }}
        >
          {soundItems.map((item, index) => (
            <motion.div
              key={item.id}
              animate={
                item.matched
                  ? { opacity: 0.3, scale: 0.9 }
                  : selectedSound?.id === item.id
                  ? { scale: 1.05 }
                  : {}
              }
            >
              <SoundButton
                colorIndex={index}
                onClick={() => handleSoundClick(item)}
                selected={selectedSound?.id === item.id}
                disabled={item.matched || state !== 'selecting'}
                isCorrect={state === 'correct' && selectedSound?.id === item.id}
                isIncorrect={state === 'incorrect' && selectedSound?.id === item.id}
              />
            </motion.div>
          ))}
        </div>

        {/* Letters row (step 2) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing[3],
            justifyContent: 'center',
          }}
        >
          {letterItems.map((item) => (
            <motion.div
              key={item.id}
              animate={
                item.matched
                  ? { opacity: 0.3, scale: 0.9 }
                  : selectedLetter?.id === item.id
                  ? { scale: 1.05 }
                  : {}
              }
            >
              <LetterCard
                letter={item.display}
                size="sm"
                onClick={() => handleLetterClick(item)}
                selected={selectedLetter?.id === item.id}
                disabled={item.matched || state !== 'selecting' || !selectedSound}
                isCorrect={state === 'correct' && selectedLetter?.id === item.id}
                isIncorrect={state === 'incorrect' && selectedLetter?.id === item.id}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      <p
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.base,
          color: colors.text.secondary,
        }}
      >
        {matchedPairs.length} / {selectedLetters.length} התאמות
      </p>

      <FeedbackOverlay
        visible={state === 'correct'}
        type="success"
        autoHideMs={800}
        onHide={() => {}}
      />

      <FeedbackOverlay
        visible={state === 'incorrect'}
        type="error"
        message="נסה שוב!"
        autoHideMs={800}
        onHide={() => {}}
      />
    </div>
  )
}

// Color palette for sound buttons - soft, kid-friendly colors
const SOUND_BUTTON_COLORS = [
  { bg: '#FFE5E5', border: '#FFB3B3' }, // soft red
  { bg: '#E5F0FF', border: '#99C2FF' }, // soft blue
  { bg: '#E5FFE5', border: '#99FF99' }, // soft green
  { bg: '#FFF5E5', border: '#FFD699' }, // soft orange
  { bg: '#F5E5FF', border: '#D699FF' }, // soft purple
  { bg: '#FFFFE5', border: '#FFFF99' }, // soft yellow
]

// Sound button component
interface SoundButtonProps {
  colorIndex: number
  onClick: () => void
  selected: boolean
  disabled: boolean
  isCorrect: boolean
  isIncorrect: boolean
}

function SoundButton({
  colorIndex,
  onClick,
  selected,
  disabled,
  isCorrect,
  isIncorrect,
}: SoundButtonProps) {
  const colorScheme = SOUND_BUTTON_COLORS[colorIndex % SOUND_BUTTON_COLORS.length]
  let borderColor = colorScheme.border
  let bgColor = colorScheme.bg

  if (selected) {
    borderColor = colors.primary[500]
  }
  if (isCorrect) {
    borderColor = colors.success[500]
    bgColor = colors.success[50]
  }
  if (isIncorrect) {
    borderColor = colors.error[400]
  }

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      style={{
        width: '64px',
        height: '64px',
        borderRadius: borderRadius.full,
        border: `3px solid ${borderColor}`,
        backgroundColor: bgColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !isCorrect ? 0.3 : 1,
        boxShadow: shadows.sm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
      }}
      whileHover={disabled ? undefined : { scale: 1.1 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
    >
      🔊
    </motion.button>
  )
}

// Utility function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default LetterMatch
