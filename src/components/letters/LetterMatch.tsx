import { motion } from 'framer-motion'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { LetterCard } from './LetterCard'
import { Button } from '../common/Button'
import { FeedbackOverlay } from '../common/FeedbackOverlay'
import { useAudio, useSoundEffects } from '../../hooks/useAudio'
import { getLetterAudioPaths } from '../../utils/audio'
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
      if (state !== 'selecting' || item.matched) return

      // Play the letter sound
      const letter = selectedLetters.find((l) => l.id === item.letterId)
      if (letter) {
        const paths = getLetterAudioPaths(letter.id)
        play(paths.sound).catch(console.error)
      }

      setSelectedLetter(item)
    },
    [state, selectedLetters, play]
  )

  const handleSoundClick = useCallback(
    (item: MatchItem) => {
      if (state !== 'selecting' || item.matched) return

      // Play the letter name
      const letter = selectedLetters.find((l) => l.id === item.letterId)
      if (letter) {
        const paths = getLetterAudioPaths(letter.id)
        play(paths.name).catch(console.error)
      }

      setSelectedSound(item)
    },
    [state, selectedLetters, play]
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
        התאם כל אות לשם שלה
      </p>

      {/* Matching area */}
      <div
        style={{
          display: 'flex',
          gap: spacing[8],
          alignItems: 'flex-start',
        }}
      >
        {/* Letters column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[3],
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
                disabled={item.matched || state !== 'selecting'}
                isCorrect={state === 'correct' && selectedLetter?.id === item.id}
                isIncorrect={state === 'incorrect' && selectedLetter?.id === item.id}
              />
            </motion.div>
          ))}
        </div>

        {/* Sound names column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[3],
          }}
        >
          {soundItems.map((item) => (
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
                name={item.display}
                onClick={() => handleSoundClick(item)}
                selected={selectedSound?.id === item.id}
                disabled={item.matched || state !== 'selecting'}
                isCorrect={state === 'correct' && selectedSound?.id === item.id}
                isIncorrect={state === 'incorrect' && selectedSound?.id === item.id}
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

// Sound button component
interface SoundButtonProps {
  name: string
  onClick: () => void
  selected: boolean
  disabled: boolean
  isCorrect: boolean
  isIncorrect: boolean
}

function SoundButton({
  name,
  onClick,
  selected,
  disabled,
  isCorrect,
  isIncorrect,
}: SoundButtonProps) {
  let borderColor = colors.neutral[200]
  let bgColor = colors.surface

  if (selected) {
    borderColor = colors.primary[500]
    bgColor = colors.primary[50]
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
        padding: `${spacing[3]} ${spacing[4]}`,
        borderRadius: borderRadius.xl,
        border: `2px solid ${borderColor}`,
        backgroundColor: bgColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !isCorrect ? 0.5 : 1,
        minWidth: '100px',
        boxShadow: shadows.sm,
      }}
      whileHover={disabled ? undefined : { scale: 1.05 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
    >
      <span
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.lg,
          color: colors.text.primary,
        }}
      >
        {name}
      </span>
      <span style={{ marginRight: spacing[2] }}>🔊</span>
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
