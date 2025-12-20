import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { NikkudIntro, type ExampleLetter } from '../../components/nikkud/NikkudIntro'
import { NikkudQuiz, type NikkudQuizOption } from '../../components/nikkud/NikkudQuiz'
import { CombinationBuilder } from '../../components/nikkud/CombinationBuilder'
import { FeedbackOverlay } from '../../components/common/FeedbackOverlay'
import { LevelCompleteScreen } from '../../components/common/LevelCompleteScreen'
import { useProgressStore } from '../../stores/progressStore'
import { Header } from '../../components/navigation/Navigation'
import { useAudio, useSoundEffects } from '../../hooks/useAudio'
import { isTTSEnabled, preloadTTS } from '../../services/tts'
import { getSyllableSoundTTS } from '../../utils/audio'

// Nikkud data structure with soundGroup for quiz logic
const NIKKUD = [
  { id: 'kamatz', mark: 'ָ', name: 'קָמָץ', sound: 'אָ', description: 'פה פתוח גדול - אָ', soundGroup: 'a', isFullVowel: false },
  { id: 'patach', mark: 'ַ', name: 'פַּתָח', sound: 'אַ', description: 'פה פתוח קצר - אַ', soundGroup: 'a', isFullVowel: false },
  { id: 'tzeire', mark: 'ֵ', name: 'צֵירֵי', sound: 'אֵ', description: 'שתי נקודות - אֵ', soundGroup: 'e', isFullVowel: false },
  { id: 'segol', mark: 'ֶ', name: 'סֶגּוֹל', sound: 'אֶ', description: 'שלוש נקודות - אֶ', soundGroup: 'e', isFullVowel: false },
  { id: 'chirik', mark: 'ִ', name: 'חִירִיק', sound: 'אִ', description: 'נקודה אחת למטה - אִ', soundGroup: 'i', isFullVowel: false },
  { id: 'cholam', mark: 'ֹ', name: 'חוֹלָם', sound: 'אֹ', description: 'נקודה למעלה - אֹ', soundGroup: 'o', isFullVowel: false },
  { id: 'kubutz', mark: 'ֻ', name: 'קֻבּוּץ', sound: 'אֻ', description: 'שלוש נקודות באלכסון - אֻ', soundGroup: 'u', isFullVowel: false },
  { id: 'shva', mark: 'ְ', name: 'שְׁוָא', sound: 'אְ', description: 'שתי נקודות אנכיות - אְ', soundGroup: 'silent', isFullVowel: false },
  // Full vowels (vav-based)
  { id: 'holam-male', mark: 'וֹ', name: 'חוֹלָם מָלֵא', sound: 'אוֹ', description: 'וָו עם נקודה למעלה - וֹ', soundGroup: 'o', isFullVowel: true },
  { id: 'shuruk', mark: 'וּ', name: 'שׁוּרוּק', sound: 'אוּ', description: 'וָו עם נקודה באמצע - וּ', soundGroup: 'u', isFullVowel: true },
]

// Fisher-Yates shuffle for proper randomization
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Example letters config - letter with dagesh info
const EXAMPLE_LETTERS_CONFIG = [
  { letter: 'ב', hasDagesh: true },
  { letter: 'מ', hasDagesh: false },
  { letter: 'ל', hasDagesh: false },
  { letter: 'ש', hasDagesh: false },
]

// Practice letters for builder (with dagesh where needed)
const PRACTICE_LETTERS = EXAMPLE_LETTERS_CONFIG.map(({ letter, hasDagesh }) =>
  letter + (hasDagesh ? 'ּ' : '')
)

type LearningStep = 'intro' | 'quiz' | 'builder' | 'complete'

const STEP_NAMES: Record<LearningStep, string> = {
  intro: 'היכרות',
  quiz: 'חידון',
  builder: 'בונה צירופים',
  complete: 'סיום'
}

const STEP_COMPONENTS: Record<LearningStep, string> = {
  intro: 'NikkudIntro',
  quiz: 'NikkudQuiz',
  builder: 'CombinationBuilder',
  complete: 'Celebration'
}

/**
 * NikkudNodeView - Learning experience for a single nikkud mark
 * Multi-step flow: intro -> quiz -> combination builder -> celebration
 */
export function NikkudNodeView() {
  const { nikkudId } = useParams<{ nikkudId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get step from URL, default to 'intro'
  const urlStep = searchParams.get('step') as LearningStep | null
  const currentStep: LearningStep = urlStep || 'intro'

  // Log activity type on load
  useEffect(() => {
    console.log(`[Activity] Level: nikkud | Node: ${nikkudId} | Step: ${currentStep} | Activity: ${STEP_NAMES[currentStep]} | Component: ${STEP_COMPONENTS[currentStep]}`)
  }, [nikkudId, currentStep])

  // Helper to change step via URL (enables browser back button)
  const setCurrentStep = useCallback((newStep: LearningStep) => {
    setSearchParams({ step: newStep }, { replace: false })
  }, [setSearchParams])

  const [showCelebration, setShowCelebration] = useState(false)
  const [showLevelComplete, setShowLevelComplete] = useState(false)

  const recordAttempt = useProgressStore((state) => state.recordAttempt)
  const initializeNode = useProgressStore((state) => state.initializeNode)
  const setNodeState = useProgressStore((state) => state.setNodeState)
  const updateLevelProgress = useProgressStore((state) => state.updateLevelProgress)
  const isLevelComplete = useProgressStore((state) => state.isLevelComplete)
  const markLevelComplete = useProgressStore((state) => state.markLevelComplete)
  const { play } = useAudio()
  const { playCelebrate } = useSoundEffects()

  // Find the nikkud data
  const nikkudData = NIKKUD.find((n) => n.id === nikkudId)

  // Initialize node progress on mount
  useEffect(() => {
    if (nikkudId) {
      const nodeId = `nikkud-${nikkudId}`
      initializeNode(nodeId, 'nikkud')
      // Only set to in_progress if not already mastered
      const currentNode = useProgressStore.getState().nodes[nodeId]
      if (!currentNode || currentNode.state !== 'mastered') {
        setNodeState(nodeId, 'in_progress')
      }

      // Set initial step if not in URL
      if (!urlStep) {
        setSearchParams({ step: 'intro' }, { replace: true })
      }
    }
  }, [nikkudId, initializeNode, setNodeState, urlStep, setSearchParams])

  // Generate example letters with their sounds for the current nikkud
  const generateExampleLetters = useCallback((): ExampleLetter[] => {
    if (!nikkudData || nikkudData.isFullVowel) return []

    return EXAMPLE_LETTERS_CONFIG.map(({ letter, hasDagesh }) => {
      // Build the letter with dagesh if needed (dagesh comes before nikkud)
      const dagesh = hasDagesh ? 'ּ' : ''
      const letterWithDagesh = letter + dagesh
      // Build the combined display: letter + dagesh + nikkud
      const display = letterWithDagesh + nikkudData.mark
      // The sound is the combined syllable
      const sound = display
      // Return letter with dagesh so NikkudCard renders correctly
      return { letter: letterWithDagesh, display, sound }
    })
  }, [nikkudData])

  const exampleLetters = generateExampleLetters()

  // Handle unknown nikkud
  if (!nikkudData) {
    return (
      <div style={{ padding: spacing[4] }}>
        <p>Nikkud not found</p>
        <button onClick={() => navigate('/nikkud')}>חזרה</button>
      </div>
    )
  }

  const nodeId = `nikkud-${nikkudId}`

  // Generate quiz options - stable across re-renders for same nikkud
  const quizOptions = useMemo((): NikkudQuizOption[] => {
    const targetSoundGroup = nikkudData.soundGroup

    // Filter out nikkud with the same sound group (to avoid confusing similar sounds)
    const eligibleDistractors = NIKKUD.filter(
      (n) => n.id !== nikkudId && n.soundGroup !== targetSoundGroup
    )

    // Shuffle and pick 3 distractors
    const selectedDistractors = shuffle(eligibleDistractors).slice(0, 3)

    // Shuffle the practice letters to get different letters for each option
    const shuffledLetters = shuffle(PRACTICE_LETTERS)

    // Create options with different letters for each
    const options: NikkudQuizOption[] = [
      {
        letter: shuffledLetters[0],
        nikkud: nikkudData.mark,
        isCorrect: true,
      },
      ...selectedDistractors.map((n, index) => ({
        letter: shuffledLetters[index + 1] || shuffledLetters[0],
        nikkud: n.mark,
        isCorrect: false,
      })),
    ]

    // Shuffle final options so correct answer is in random position
    return shuffle(options)
  }, [nikkudId, nikkudData.soundGroup, nikkudData.mark])

  // Generate nikkud options for combination builder
  const nikkudOptions = useMemo(() => {
    // Include current nikkud and 2-3 others (shuffled)
    const otherNikkud = shuffle(NIKKUD.filter((n) => n.id !== nikkudId)).slice(0, 3)
    const allOptions = shuffle([nikkudData, ...otherNikkud])

    return allOptions.map((n) => ({
      mark: n.mark,
      name: n.name,
    }))
  }, [nikkudId, nikkudData])

  // Generate random target letter for combination builder (stable per nikkud)
  const builderTarget = useMemo(() => {
    const letterConfig = EXAMPLE_LETTERS_CONFIG[Math.floor(Math.random() * EXAMPLE_LETTERS_CONFIG.length)]
    const dagesh = letterConfig.hasDagesh ? 'ּ' : ''
    const letter = letterConfig.letter + dagesh
    const sound = letter + nikkudData.mark
    return { letter, sound }
  }, [nikkudData.mark])

  // Preload sounds for current step only
  useEffect(() => {
    if (!nikkudData || !isTTSEnabled()) return

    const sounds: string[] = []

    switch (currentStep) {
      case 'intro':
        // Main nikkud sound + example letters
        sounds.push(`[syllable]${nikkudData.sound}`)
        if (!nikkudData.isFullVowel) {
          exampleLetters.forEach(ex => sounds.push(`[syllable]${ex.sound}`))
        }
        break
      case 'quiz': {
        // Just the correct quiz option sound
        const correctOption = quizOptions.find(opt => opt.isCorrect)
        if (correctOption) {
          sounds.push(`[syllable]${correctOption.letter}${correctOption.nikkud}`)
        }
        break
      }
      case 'builder':
        // Just the builder target sound
        sounds.push(`[syllable]${builderTarget.sound}`)
        break
      // 'complete' step doesn't need audio
    }

    if (sounds.length > 0) {
      preloadTTS(sounds)
    }
  }, [nikkudData, currentStep, exampleLetters, quizOptions, builderTarget])

  // Step handlers
  const handleIntroContinue = () => {
    setCurrentStep('quiz')
  }

  const handleQuizAnswer = (isCorrect: boolean) => {
    recordAttempt(nodeId, {
      itemId: 'quiz',
      correct: isCorrect,
      timestamp: Date.now(),
      timeMs: 0,
    })
  }

  const handleQuizComplete = () => {
    setCurrentStep('builder')
  }

  const handleBuilderCorrect = () => {
    recordAttempt(nodeId, {
      itemId: 'builder',
      correct: true,
      timestamp: Date.now(),
      timeMs: 0,
    })

    // Move to completion
    setTimeout(() => {
      setNodeState(nodeId, 'mastered')
      updateLevelProgress('nikkud')

      // Check if this completes the entire level
      if (isLevelComplete('nikkud')) {
        markLevelComplete('nikkud')
        setShowLevelComplete(true)
      } else {
        setCurrentStep('complete')
        setShowCelebration(true)
        playCelebrate()

        // Navigate back after celebration
        setTimeout(() => {
          navigate('/nikkud')
        }, 3000)
      }
    }, 1500)
  }

  const handleBuilderIncorrect = () => {
    recordAttempt(nodeId, {
      itemId: 'builder',
      correct: false,
      timestamp: Date.now(),
      timeMs: 0,
    })
  }

  const handlePlaySound = () => {
    if (nikkudData && isTTSEnabled()) {
      play(getSyllableSoundTTS(nikkudData.sound)).catch(console.error)
    }
  }

  // Play the correct quiz option's sound (letter + nikkud)
  const handlePlayQuizSound = useCallback(() => {
    if (isTTSEnabled()) {
      const correctOption = quizOptions.find(opt => opt.isCorrect)
      if (correctOption) {
        const sound = correctOption.letter + correctOption.nikkud
        play(getSyllableSoundTTS(sound)).catch(console.error)
      }
    }
  }, [quizOptions, play])

  const handlePlayBuilderSound = () => {
    if (isTTSEnabled()) {
      play(getSyllableSoundTTS(builderTarget.sound)).catch(console.error)
    }
  }

  const handlePlayExample = (sound: string) => {
    if (isTTSEnabled()) {
      play(getSyllableSoundTTS(sound)).catch(console.error)
    }
  }

  const handleBack = () => {
    navigate('/nikkud')
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
        title={nikkudData.name}
        subtitle={`למד את ה${nikkudData.name}`}
        showBack
        onBack={handleBack}
      />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: spacing[4],
          position: 'relative',
        }}
      >
        {/* Progress indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: spacing[2],
            marginBottom: spacing[6],
          }}
        >
          {(['intro', 'quiz', 'builder'] as const).map((step, index) => {
            const steps: LearningStep[] = ['intro', 'quiz', 'builder', 'complete']
            const currentStepIndex = steps.indexOf(currentStep)
            return (
              <div
                key={step}
                style={{
                  width: '40px',
                  height: '6px',
                  borderRadius: borderRadius.full,
                  backgroundColor:
                    currentStep === step
                      ? colors.secondary[500]
                      : currentStepIndex > index
                        ? colors.secondary[300]
                        : colors.neutral[200],
                  transition: 'background-color 0.3s',
                }}
              />
            )
          })}
        </div>

        {/* Learning steps */}
        <AnimatePresence mode="wait">
          {currentStep === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <NikkudIntro
                nikkud={nikkudData.mark}
                nikkudName={nikkudData.name}
                description={nikkudData.description}
                exampleLetters={exampleLetters}
                exampleWord={nikkudData.isFullVowel ? (nikkudData.id === 'holam-male' ? 'טוֹב' : 'שׁוּק') : undefined}
                isFullVowel={nikkudData.isFullVowel}
                onPlaySound={handlePlaySound}
                onPlayExample={handlePlayExample}
                onContinue={handleIntroContinue}
              />
            </motion.div>
          )}

          {currentStep === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <NikkudQuiz
                targetSound={nikkudData.sound}
                nikkudName={nikkudData.name}
                options={quizOptions}
                onAnswer={handleQuizAnswer}
                onComplete={handleQuizComplete}
                onPlaySound={handlePlayQuizSound}
              />
            </motion.div>
          )}

          {currentStep === 'builder' && (
            <motion.div
              key="builder"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <CombinationBuilder
                letters={PRACTICE_LETTERS}
                nikkudOptions={nikkudOptions}
                targetLetter={builderTarget.letter}
                targetNikkud={nikkudData.mark}
                targetSound={builderTarget.sound}
                onCorrect={handleBuilderCorrect}
                onIncorrect={handleBuilderIncorrect}
                onPlaySound={handlePlayBuilderSound}
              />
            </motion.div>
          )}

          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
                style={{
                  fontSize: '6rem',
                  marginBottom: spacing[4],
                }}
              >
                🎉
              </motion.div>
              <h2
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.secondary[600],
                  marginBottom: spacing[2],
                }}
              >
                כל הכבוד!
              </h2>
              <p
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize.xl,
                  color: colors.text.secondary,
                  marginBottom: spacing[6],
                }}
              >
                סיימת ללמוד את ה{nikkudData.name}!
              </p>
              <motion.div
                style={{
                  backgroundColor: colors.secondary[50],
                  padding: spacing[6],
                  borderRadius: borderRadius['2xl'],
                  boxShadow: shadows.lg,
                }}
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              >
                <span
                  style={{
                    fontFamily: typography.fontFamily.hebrew,
                    fontSize: '5rem',
                    lineHeight: 1,
                  }}
                >
                  {nikkudData.isFullVowel ? nikkudData.mark : `א${nikkudData.mark}`}
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebration overlay */}
        <FeedbackOverlay
          visible={showCelebration}
          type="celebration"
          message={`למדת את ה${nikkudData.name}!`}
          onHide={() => setShowCelebration(false)}
          autoHideMs={2500}
        />

        {/* Level complete screen */}
        {showLevelComplete && (
          <LevelCompleteScreen
            levelId="nikkud"
            nextLevelId="syllables"
          />
        )}
      </main>
    </div>
  )
}

export default NikkudNodeView
