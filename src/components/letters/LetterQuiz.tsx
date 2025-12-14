import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useEffect } from 'react'
import { colors, typography, spacing } from '../../styles/theme'
import { LetterCard } from './LetterCard'
import { Button } from '../common/Button'
import { FeedbackOverlay } from '../common/FeedbackOverlay'
import { useAudio } from '../../hooks/useAudio'
import { useSoundEffects } from '../../hooks/useAudio'
import { getLetterAudioPaths } from '../../utils/audio'
import type { Letter } from '../../types/entities'

export interface LetterQuizProps {
  /** The target letter to identify */
  targetLetter: Letter
  /** Array of letter options (including the target) */
  options: Letter[]
  /** Prompt text to display */
  prompt?: string
  /** Called when an answer is selected */
  onAnswer: (correct: boolean, selectedId: string) => void
  /** Called when ready to move to next question */
  onNext: () => void
  /** Whether to play audio prompt */
  playAudio?: boolean
}

type QuizState = 'prompt' | 'answering' | 'correct' | 'incorrect' | 'complete'

/**
 * LetterQuiz - Quiz component for letter identification
 * "Tap the letter that makes this sound" or "Tap the letter X"
 */
export function LetterQuiz({
  targetLetter,
  options,
  prompt,
  onAnswer,
  onNext,
  playAudio = true,
}: LetterQuizProps) {
  const [state, setState] = useState<QuizState>('prompt')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { play } = useAudio()
  const { playSuccess, playError } = useSoundEffects()
  const audioPaths = getLetterAudioPaths(targetLetter.id)

  // Play audio prompt on mount
  useEffect(() => {
    if (state !== 'prompt') return

    if (playAudio) {
      const timer = setTimeout(() => {
        play(audioPaths.name)
          .then(() => setState('answering'))
          .catch(() => setState('answering'))
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setState('answering')
    }
  }, [playAudio, audioPaths.name, play, state])

  const handleOptionClick = useCallback(
    (letter: Letter) => {
      if (state !== 'answering') return

      setSelectedId(letter.id)
      const isCorrect = letter.id === targetLetter.id

      if (isCorrect) {
        setState('correct')
        playSuccess().catch(console.error)
        onAnswer(true, letter.id)
      } else {
        setState('incorrect')
        playError().catch(console.error)
        onAnswer(false, letter.id)
      }
    },
    [state, targetLetter.id, onAnswer, playSuccess, playError]
  )

  const handleNext = useCallback(() => {
    setState('complete')
    onNext()
  }, [onNext])

  const handleTryAgain = useCallback(() => {
    setSelectedId(null)
    setState('answering')
  }, [])

  const handleReplayPrompt = useCallback(() => {
    play(audioPaths.name).catch(console.error)
  }, [play, audioPaths.name])

  const defaultPrompt = `מצא את האות ${targetLetter.name}`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[6],
        padding: spacing[4],
        minHeight: '60vh',
      }}
    >
      {/* Prompt */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          textAlign: 'center',
        }}
      >
        <motion.button
          onClick={handleReplayPrompt}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: spacing[2],
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize['2xl'],
              color: colors.text.primary,
              margin: 0,
            }}
          >
            {prompt || defaultPrompt}
          </p>
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              margin: 0,
            }}
          >
            🔊
          </p>
        </motion.button>
      </motion.div>

      {/* Options grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: spacing[4],
          maxWidth: '350px',
          width: '100%',
        }}
      >
        {options.map((letter, index) => {
          const isSelected = selectedId === letter.id
          const isTarget = letter.id === targetLetter.id
          const showCorrect = state === 'correct' && isSelected
          const showIncorrect = state === 'incorrect' && isSelected

          return (
            <motion.div
              key={letter.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <LetterCard
                letter={letter.character}
                size="md"
                onClick={() => handleOptionClick(letter)}
                selected={isSelected && state === 'answering'}
                isCorrect={showCorrect}
                isIncorrect={showIncorrect}
                disabled={state !== 'answering'}
                showGlow={state === 'incorrect' && isTarget}
              />
            </motion.div>
          )
        })}
      </div>

      {/* Continue or try again buttons */}
      <AnimatePresence>
        {state === 'correct' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button variant="success" size="lg" onClick={handleNext}>
              הבא ←
            </Button>
          </motion.div>
        )}

        {state === 'incorrect' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing[3],
            }}
          >
            <p
              style={{
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize.lg,
                color: colors.text.secondary,
                textAlign: 'center',
              }}
            >
              הנה האות הנכונה! 👆
            </p>
            <Button variant="primary" size="lg" onClick={handleTryAgain}>
              ננסה שוב
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback overlay */}
      <FeedbackOverlay
        visible={state === 'correct'}
        type="success"
        message="כל הכבוד! 🌟"
        autoHideMs={1500}
        onHide={() => {}}
      />

      <FeedbackOverlay
        visible={state === 'incorrect'}
        type="error"
        message="כמעט! נסה שוב"
        autoHideMs={1500}
        onHide={() => {}}
      />
    </div>
  )
}

export default LetterQuiz
