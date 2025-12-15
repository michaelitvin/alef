import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { NikkudIntro } from '../../components/nikkud/NikkudIntro'
import { NikkudQuiz, type NikkudQuizOption } from '../../components/nikkud/NikkudQuiz'
import { CombinationBuilder } from '../../components/nikkud/CombinationBuilder'
import { FeedbackOverlay } from '../../components/common/FeedbackOverlay'
import { useProgressStore } from '../../stores/progressStore'
import { Header } from '../../components/navigation/Navigation'
import { useAudio } from '../../hooks/useAudio'
import { getTTS, isTTSEnabled } from '../../services/tts'

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
  { id: 'holam-male', mark: 'וֹ', name: 'חוֹלָם מָלֵא', sound: 'וֹ', description: 'וָו עם נקודה למעלה - וֹ', soundGroup: 'o', isFullVowel: true },
  { id: 'shuruk', mark: 'וּ', name: 'שׁוּרוּק', sound: 'וּ', description: 'וָו עם נקודה באמצע - וּ', soundGroup: 'u', isFullVowel: true },
]

// Sample letters for building combinations
const PRACTICE_LETTERS = ['ב', 'מ', 'ל', 'ש']

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

  const recordAttempt = useProgressStore((state) => state.recordAttempt)
  const initializeNode = useProgressStore((state) => state.initializeNode)
  const setNodeState = useProgressStore((state) => state.setNodeState)
  const { play } = useAudio()

  // Find the nikkud data
  const nikkudData = NIKKUD.find((n) => n.id === nikkudId)

  // Initialize node progress on mount
  useEffect(() => {
    if (nikkudId) {
      const nodeId = `nikkud-${nikkudId}`
      initializeNode(nodeId, 'nikkud')
      setNodeState(nodeId, 'in_progress')

      // Set initial step if not in URL
      if (!urlStep) {
        setSearchParams({ step: 'intro' }, { replace: true })
      }
    }
  }, [nikkudId, initializeNode, setNodeState, urlStep, setSearchParams])

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

  // Generate quiz options for the current nikkud
  // Uses different letters for each option to prevent visual nikkud matching
  // Avoids similar-sounding distractors (patach/kamatz, tsere/segol)
  const generateQuizOptions = (): NikkudQuizOption[] => {
    // Get the sound group of the target nikkud
    const targetSoundGroup = nikkudData.soundGroup

    // Filter out nikkud with the same sound group (to avoid confusing similar sounds)
    // Also exclude the target nikkud itself
    const eligibleDistractors = NIKKUD.filter(
      (n) => n.id !== nikkudId && n.soundGroup !== targetSoundGroup
    )

    // Shuffle and pick 3 distractors
    const shuffledDistractors = [...eligibleDistractors].sort(() => Math.random() - 0.5)
    const selectedDistractors = shuffledDistractors.slice(0, 3)

    // Shuffle the practice letters to get different letters for each option
    const shuffledLetters = [...PRACTICE_LETTERS].sort(() => Math.random() - 0.5)

    // Create options with different letters for each
    const options: NikkudQuizOption[] = [
      {
        letter: shuffledLetters[0],
        nikkud: nikkudData.mark,
        isCorrect: true,
      },
      ...selectedDistractors.map((n, index) => ({
        letter: shuffledLetters[index + 1] || shuffledLetters[0], // Fallback if not enough letters
        nikkud: n.mark,
        isCorrect: false,
      })),
    ]

    // Shuffle options
    return options.sort(() => Math.random() - 0.5)
  }

  // Generate nikkud options for combination builder
  const generateNikkudOptions = () => {
    // Include current nikkud and 2-3 others
    const otherNikkud = NIKKUD.filter((n) => n.id !== nikkudId).slice(0, 3)
    const allOptions = [nikkudData, ...otherNikkud]

    return allOptions.map((n) => ({
      mark: n.mark,
      name: n.name,
    }))
  }

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
      setCurrentStep('complete')
      setShowCelebration(true)
      setNodeState(nodeId, 'mastered')

      // Navigate back after celebration
      setTimeout(() => {
        navigate('/nikkud')
      }, 3000)
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
      play(getTTS(nikkudData.sound)).catch(console.error)
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
                exampleLetter={nikkudData.isFullVowel ? (nikkudData.id === 'holam-male' ? 'טוֹב' : 'שׁוּק') : 'ב'}
                isFullVowel={nikkudData.isFullVowel}
                onPlaySound={handlePlaySound}
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
                options={generateQuizOptions()}
                onAnswer={handleQuizAnswer}
                onComplete={handleQuizComplete}
                onPlaySound={handlePlaySound}
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
                nikkudOptions={generateNikkudOptions()}
                targetLetter="ב"
                targetNikkud={nikkudData.mark}
                targetSound={nikkudData.sound}
                onCorrect={handleBuilderCorrect}
                onIncorrect={handleBuilderIncorrect}
                onPlaySound={handlePlaySound}
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
                  א{nikkudData.mark}
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
      </main>
    </div>
  )
}

export default NikkudNodeView
