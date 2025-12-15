import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SentenceReader } from '../../components/sentences/SentenceReader'
import { ComprehensionQuiz, type ComprehensionOption } from '../../components/sentences/ComprehensionQuiz'
import { FeedbackOverlay } from '../../components/common/FeedbackOverlay'
import { Header } from '../../components/navigation/Navigation'
import { useProgressStore } from '../../stores/progressStore'
import { importYaml } from '../../utils/yaml'
import { colors, typography, spacing, borderRadius } from '../../styles/theme'
import { useAudio } from '../../hooks/useAudio'
import { getTTS, isTTSEnabled } from '../../services/tts'

// Types matching the YAML structure
interface SentenceData {
  id: string
  sentence: string
  words: string[]
  translation: string
  difficulty: number
  audioSentence: string
}

interface ComprehensionData {
  sentenceId: string
  question: string
  options: ComprehensionOption[]
}

interface SentencesYaml {
  sentences: SentenceData[]
  comprehension: ComprehensionData[]
}

// Sentence group definitions (matching SentencesPage.tsx)
const SENTENCE_GROUPS = [
  { id: 'basic-1', name: 'משפטים פשוטים א', icon: '📖', difficulty: 1 },
  { id: 'basic-2', name: 'משפטים פשוטים ב', icon: '📗', difficulty: 1 },
  { id: 'medium-1', name: 'משפטים בינוניים א', icon: '📘', difficulty: 2 },
  { id: 'medium-2', name: 'משפטים בינוניים ב', icon: '📙', difficulty: 2 },
  { id: 'advanced-1', name: 'משפטים מתקדמים א', icon: '📕', difficulty: 3 },
  { id: 'advanced-2', name: 'משפטים מתקדמים ב', icon: '📚', difficulty: 3 },
]

type LearningPhase = 'reading' | 'quiz'

/**
 * SentenceGroupView - Learning experience for a sentence group
 * Cycles through sentences: SentenceReader → ComprehensionQuiz
 */
export function SentenceGroupView() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get phase and sentence index from URL (enables browser back button)
  const urlPhase = searchParams.get('phase') as LearningPhase | null
  const urlSentenceIndex = searchParams.get('sentence')
  const phase: LearningPhase = urlPhase || 'reading'
  const currentSentenceIndex = urlSentenceIndex ? parseInt(urlSentenceIndex, 10) : 0

  // Helper to change phase via URL
  const setPhase = useCallback((newPhase: LearningPhase) => {
    setSearchParams({ phase: newPhase, sentence: String(currentSentenceIndex) }, { replace: false })
  }, [setSearchParams, currentSentenceIndex])

  // Helper to change sentence index via URL
  const setCurrentSentenceIndex = useCallback((newIndex: number | ((prev: number) => number)) => {
    const resolvedIndex = typeof newIndex === 'function' ? newIndex(currentSentenceIndex) : newIndex
    setSearchParams({ phase: 'reading', sentence: String(resolvedIndex) }, { replace: false })
  }, [setSearchParams, currentSentenceIndex])

  // State
  const [sentences, setSentences] = useState<SentenceData[]>([])
  const [comprehensionData, setComprehensionData] = useState<ComprehensionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  // Progress store
  const recordAttempt = useProgressStore((state) => state.recordAttempt)
  const setNodeState = useProgressStore((state) => state.setNodeState)
  const updateCurrentActivity = useProgressStore((state) => state.updateCurrentActivity)
  const { play } = useAudio()

  // Find the current group
  const currentGroup = SENTENCE_GROUPS.find((g) => g.id === groupId)
  const nodeId = `sentences-${groupId}`

  // Load sentences from YAML
  useEffect(() => {
    async function loadSentences() {
      try {
        setLoading(true)
        const data = await importYaml<SentencesYaml>(() => import('../../data/sentences.yaml'))

        // Filter sentences by difficulty level
        const difficulty = currentGroup?.difficulty || 1
        const filteredSentences = data.sentences.filter((s) => s.difficulty === difficulty)

        // For each group, we'll take a subset of sentences
        // Group 1 gets first half, Group 2 gets second half
        const isFirstGroup = groupId?.endsWith('-1')
        const midpoint = Math.ceil(filteredSentences.length / 2)
        const groupSentences = isFirstGroup
          ? filteredSentences.slice(0, midpoint)
          : filteredSentences.slice(midpoint)

        setSentences(groupSentences)
        setComprehensionData(data.comprehension)
        setLoading(false)

        // Set initial URL state if not present
        if (!urlPhase) {
          setSearchParams({ phase: 'reading', sentence: '0' }, { replace: true })
        }
      } catch (err) {
        console.error('Error loading sentences:', err)
        setError('לא ניתן לטעון את המשפטים')
        setLoading(false)
      }
    }

    loadSentences()
  }, [groupId, currentGroup?.difficulty, urlPhase, setSearchParams])

  // Update current activity in progress store
  useEffect(() => {
    if (!loading && sentences.length > 0) {
      updateCurrentActivity('sentences', nodeId, sentences[currentSentenceIndex]?.id)
    }
  }, [loading, sentences, currentSentenceIndex, nodeId, updateCurrentActivity])

  // Get current sentence and comprehension
  const currentSentence = sentences[currentSentenceIndex]
  const currentComprehension = currentSentence
    ? comprehensionData.find((c) => c.sentenceId === currentSentence.id)
    : null

  // Handle sentence reader continue
  const handleReaderContinue = useCallback(() => {
    if (currentComprehension) {
      // Move to quiz phase
      setPhase('quiz')
    } else {
      // No quiz, move to next sentence
      moveToNextSentence()
    }
  }, [currentComprehension])

  // Handle quiz answer
  const handleQuizAnswer = useCallback(
    (isCorrect: boolean) => {
      // Record attempt in progress store
      recordAttempt(nodeId, {
        itemId: currentSentence.id,
        correct: isCorrect,
        timeMs: 0, // Could track time if needed
        timestamp: Date.now(),
      })
    },
    [nodeId, currentSentence, recordAttempt]
  )

  // Handle quiz completion
  const handleQuizComplete = useCallback(() => {
    moveToNextSentence()
  }, [])

  // Move to next sentence
  const moveToNextSentence = useCallback(() => {
    if (currentSentenceIndex < sentences.length - 1) {
      // More sentences to go
      setCurrentSentenceIndex((prev) => prev + 1)
      setPhase('reading')
    } else {
      // All sentences completed
      completeGroup()
    }
  }, [currentSentenceIndex, sentences.length])

  // Complete the group
  const completeGroup = useCallback(() => {
    // Mark node as mastered
    setNodeState(nodeId, 'mastered')

    // Show celebration
    setShowCelebration(true)

    // Navigate back after celebration
    setTimeout(() => {
      navigate('/sentences')
    }, 3000)
  }, [nodeId, setNodeState, navigate])

  // Handle back button
  const handleBack = () => {
    navigate('/sentences')
  }

  // Audio handlers
  const handlePlayWord = (index: number) => {
    if (currentSentence && isTTSEnabled()) {
      const word = currentSentence.words[index]
      play(getTTS(word)).catch(console.error)
    }
  }

  const handlePlaySentence = () => {
    if (currentSentence && isTTSEnabled()) {
      play(getTTS(currentSentence.sentence)).catch(console.error)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: colors.background,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            fontSize: '3rem',
            marginBottom: spacing[4],
          }}
        >
          📖
        </motion.div>
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.xl,
            color: colors.text.secondary,
          }}
        >
          טוען משפטים...
        </p>
      </div>
    )
  }

  // Error state
  if (error || !currentGroup || sentences.length === 0) {
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
          title="משפטים"
          subtitle={currentGroup?.name || ''}
          showBack
          onBack={handleBack}
        />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing[6],
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '4rem', marginBottom: spacing[4] }}>⚠️</span>
          <h2
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing[2],
            }}
          >
            {error || 'לא נמצאו משפטים'}
          </h2>
          <motion.button
            onClick={handleBack}
            style={{
              marginTop: spacing[4],
              padding: `${spacing[3]} ${spacing[6]}`,
              borderRadius: borderRadius.xl,
              border: 'none',
              backgroundColor: colors.primary[500],
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: colors.surface,
              cursor: 'pointer',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            חזור למשפטים
          </motion.button>
        </div>
      </div>
    )
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
        title={currentGroup.icon + ' ' + currentGroup.name}
        subtitle={`משפט ${currentSentenceIndex + 1} מתוך ${sentences.length}`}
        showBack
        onBack={handleBack}
      />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: spacing[4],
          paddingTop: spacing[8],
        }}
      >
        {/* Progress indicator */}
        <div
          style={{
            display: 'flex',
            gap: spacing[2],
            justifyContent: 'center',
            marginBottom: spacing[6],
          }}
        >
          {sentences.map((_, index) => (
            <div
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  index < currentSentenceIndex
                    ? colors.success[500]
                    : index === currentSentenceIndex
                      ? colors.primary[500]
                      : colors.neutral[300],
              }}
            />
          ))}
        </div>

        {/* Learning content */}
        {phase === 'reading' && currentSentence && (
          <SentenceReader
            sentence={currentSentence.sentence}
            words={currentSentence.words}
            translation={currentSentence.translation}
            onPlayWord={handlePlayWord}
            onPlaySentence={handlePlaySentence}
            onContinue={handleReaderContinue}
          />
        )}

        {phase === 'quiz' && currentSentence && currentComprehension && (
          <ComprehensionQuiz
            sentence={currentSentence.sentence}
            question={currentComprehension.question}
            options={currentComprehension.options}
            onAnswer={handleQuizAnswer}
            onComplete={handleQuizComplete}
            onPlaySentence={handlePlaySentence}
          />
        )}
      </main>

      {/* Completion celebration */}
      <FeedbackOverlay
        visible={showCelebration}
        type="celebration"
        message="כל הכבוד! סיימת את הקבוצה!"
        autoHideMs={0}
        onHide={() => setShowCelebration(false)}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: spacing[4],
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ fontSize: '6rem' }}
          >
            🌟
          </motion.div>
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize['4xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.star,
              textAlign: 'center',
            }}
          >
            כל הכבוד!
          </p>
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize['2xl'],
              color: colors.primary[600],
              textAlign: 'center',
            }}
          >
            סיימת את {currentGroup.name}!
          </p>
        </motion.div>
      </FeedbackOverlay>
    </div>
  )
}

export default SentenceGroupView
