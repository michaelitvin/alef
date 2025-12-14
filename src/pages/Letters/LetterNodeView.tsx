import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, typography, spacing } from '../../styles/theme'
import { Header } from '../../components/navigation/Navigation'
import { LetterIntro } from '../../components/letters/LetterIntro'
import { LetterQuiz } from '../../components/letters/LetterQuiz'
import { LetterMatch } from '../../components/letters/LetterMatch'
import { useProgressStore } from '../../stores/progressStore'
import { getLetterById, getLetterQuizOptions, LETTERS_SIMPLE } from '../../data/lettersData'
import type { Letter } from '../../types/entities'

type LearningStep = 'loading' | 'intro' | 'quiz' | 'match' | 'complete'

/**
 * LetterNodeView - Learning experience for a single letter
 * Multi-step flow: Intro -> Quiz -> Match -> Completion
 */
export function LetterNodeView() {
  const { letterId } = useParams<{ letterId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get step from URL, default to 'loading'
  const urlStep = searchParams.get('step') as LearningStep | null
  const step: LearningStep = urlStep || 'loading'

  // Helper to change step via URL (enables browser back button)
  const setStep = useCallback((newStep: LearningStep) => {
    if (newStep === 'loading') {
      // Don't add loading to history
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ step: newStep }, { replace: false })
    }
  }, [setSearchParams])

  const [letter, setLetter] = useState<Letter | null>(null)
  const [quizOptions, setQuizOptions] = useState<Letter[]>([])
  const [matchLetters, setMatchLetters] = useState<Letter[]>([])

  const recordAttempt = useProgressStore((state) => state.recordAttempt)
  const setNodeState = useProgressStore((state) => state.setNodeState)
  const updateLevelProgress = useProgressStore((state) => state.updateLevelProgress)

  // Load letter data
  useEffect(() => {
    async function loadLetterData() {
      if (!letterId) {
        navigate('/letters')
        return
      }

      try {
        const letterData = await getLetterById(letterId)
        if (!letterData) {
          console.error(`Letter not found: ${letterId}`)
          navigate('/letters')
          return
        }

        setLetter(letterData)

        // Load quiz options
        const options = await getLetterQuizOptions(letterId, 4)
        setQuizOptions(options)

        // Get 3 letters for matching (current + 2 previous or random)
        const letterIndex = LETTERS_SIMPLE.findIndex(l => l.id === letterId)
        const matchIds: string[] = []

        // Add current letter
        matchIds.push(letterId)

        // Add previous letters if available
        if (letterIndex > 0) {
          matchIds.push(LETTERS_SIMPLE[letterIndex - 1].id)
        }
        if (letterIndex > 1) {
          matchIds.push(LETTERS_SIMPLE[letterIndex - 2].id)
        }

        // If we don't have 3 yet, add next letters
        while (matchIds.length < 3 && letterIndex + matchIds.length < LETTERS_SIMPLE.length) {
          matchIds.push(LETTERS_SIMPLE[letterIndex + matchIds.length].id)
        }

        // Load full letter data for matching
        const matchData = await Promise.all(
          matchIds.slice(0, 3).map(id => getLetterById(id))
        )
        setMatchLetters(matchData.filter((l): l is Letter => l !== null))

        // Mark node as in progress
        const nodeId = `letters-${letterId}`
        setNodeState(nodeId, 'in_progress')

        // Only set step to intro if no step is in URL (first load)
        // Use replace to avoid adding to history on initial load
        if (!urlStep) {
          setSearchParams({ step: 'intro' }, { replace: true })
        }
      } catch (error) {
        console.error('Error loading letter data:', error)
        navigate('/letters')
      }
    }

    loadLetterData()
  }, [letterId, navigate, setNodeState, urlStep, setSearchParams])

  const handleIntroComplete = () => {
    setStep('quiz')
  }

  const handleQuizAnswer = (correct: boolean, selectedId: string) => {
    if (!letterId) return

    const nodeId = `letters-${letterId}`
    recordAttempt(nodeId, {
      itemId: `quiz-${selectedId}`,
      correct,
      timeMs: 0,
      timestamp: Date.now(),
    })
  }

  const handleQuizNext = () => {
    setStep('match')
  }

  const handleMatchAttempt = (correct: boolean, matchedLetterId: string) => {
    if (!letterId) return

    const nodeId = `letters-${letterId}`
    recordAttempt(nodeId, {
      itemId: `match-${matchedLetterId}`,
      correct,
      timeMs: 0,
      timestamp: Date.now(),
    })
  }

  const handleMatchComplete = () => {
    setStep('complete')

    // Mark letter as mastered
    if (letterId) {
      const nodeId = `letters-${letterId}`
      setNodeState(nodeId, 'mastered')
      updateLevelProgress('letters')
    }
  }

  const handleComplete = () => {
    navigate('/letters')
  }

  const handleBack = () => {
    navigate('/letters')
  }

  if (step === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: colors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.xl,
            color: colors.text.secondary,
          }}
        >
          טוען...
        </p>
      </div>
    )
  }

  if (!letter) {
    return null
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Header
        title={`למד את האות ${letter.name}`}
        subtitle={letter.character}
        showBack
        onBack={handleBack}
      />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: spacing[4],
        }}
      >
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <LetterIntro
                letter={letter}
                onComplete={handleIntroComplete}
              />
            </motion.div>
          )}

          {step === 'quiz' && quizOptions.length > 0 && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <LetterQuiz
                targetLetter={letter}
                options={quizOptions}
                onAnswer={handleQuizAnswer}
                onNext={handleQuizNext}
                playAudio={true}
              />
            </motion.div>
          )}

          {step === 'match' && matchLetters.length > 0 && (
            <motion.div
              key="match"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <LetterMatch
                letters={matchLetters}
                onMatch={handleMatchAttempt}
                onComplete={handleMatchComplete}
              />
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing[6],
                minHeight: '60vh',
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                style={{
                  fontSize: '5rem',
                }}
              >
                🎉
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: typography.fontFamily.hebrew,
                    fontSize: typography.fontSize['3xl'],
                    color: colors.primary[600],
                    margin: 0,
                    marginBottom: spacing[2],
                  }}
                >
                  כל הכבוד!
                </p>
                <p
                  style={{
                    fontFamily: typography.fontFamily.hebrew,
                    fontSize: typography.fontSize.xl,
                    color: colors.text.secondary,
                    margin: 0,
                  }}
                >
                  למדת את האות {letter.name}
                </p>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{
                  display: 'flex',
                  fontSize: typography.fontSize['4xl'],
                  fontFamily: typography.fontFamily.hebrew,
                  color: colors.primary[500],
                }}
              >
                {letter.character}
              </motion.div>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={handleComplete}
                style={{
                  padding: `${spacing[3]} ${spacing[6]}`,
                  backgroundColor: colors.primary[500],
                  color: colors.surface,
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize.xl,
                  cursor: 'pointer',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                חזרה למסע האותיות
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default LetterNodeView
