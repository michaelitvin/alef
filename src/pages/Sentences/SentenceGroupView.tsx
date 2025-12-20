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
import { useAudio, useSoundEffects } from '../../hooks/useAudio'
import { LevelCompleteScreen } from '../../components/common/LevelCompleteScreen'
import { getTTS, isTTSEnabled } from '../../services/tts'
import { SENTENCE_NODES } from '../../data/levelNodes'

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


type LearningPhase = 'reading' | 'quiz'

const PHASE_NAMES: Record<LearningPhase, string> = {
  reading: 'קריאה',
  quiz: 'חידון'
}

const PHASE_COMPONENTS: Record<LearningPhase, string> = {
  reading: 'SentenceReader',
  quiz: 'ComprehensionQuiz'
}

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

  // Log activity type on load
  useEffect(() => {
    console.log(`[Activity] Level: sentences | Node: ${groupId} | Step: ${phase} | Activity: ${PHASE_NAMES[phase]} | Component: ${PHASE_COMPONENTS[phase]} | Item: ${currentSentenceIndex}`)
  }, [groupId, phase, currentSentenceIndex])

  // Helper to change phase via URL
  const setPhase = useCallback((newPhase: LearningPhase) => {
    setSearchParams({ phase: newPhase, sentence: String(currentSentenceIndex) }, { replace: false })
  }, [setSearchParams, currentSentenceIndex])

  // State
  const [sentences, setSentences] = useState<SentenceData[]>([])
  const [comprehensionData, setComprehensionData] = useState<ComprehensionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showLevelComplete, setShowLevelComplete] = useState(false)

  // Progress store
  const recordAttempt = useProgressStore((state) => state.recordAttempt)
  const setNodeState = useProgressStore((state) => state.setNodeState)
  const updateCurrentActivity = useProgressStore((state) => state.updateCurrentActivity)
  const updateLevelProgress = useProgressStore((state) => state.updateLevelProgress)
  const isLevelComplete = useProgressStore((state) => state.isLevelComplete)
  const markLevelComplete = useProgressStore((state) => state.markLevelComplete)
  const { play } = useAudio()
  const { playCelebrate } = useSoundEffects()

  // Find the current group
  const currentGroup = SENTENCE_NODES.find((g) => g.id === groupId)
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
      if (currentSentenceIndex < sentences.length - 1) {
        const nextIndex = currentSentenceIndex + 1
        setSearchParams({ phase: 'reading', sentence: String(nextIndex) }, { replace: false })
      } else {
        // All sentences completed
        setNodeState(nodeId, 'mastered')
        updateLevelProgress('sentences')

        // Check if this completes the entire level
        if (isLevelComplete('sentences')) {
          markLevelComplete('sentences')
          setShowLevelComplete(true)
        } else {
          setShowCelebration(true)
          playCelebrate()
          setTimeout(() => {
            navigate('/sentences')
          }, 3000)
        }
      }
    }
  }, [currentComprehension, currentSentenceIndex, sentences.length, setPhase, setSearchParams, setNodeState, nodeId, navigate, playCelebrate, updateLevelProgress, isLevelComplete, markLevelComplete])

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
    if (currentSentenceIndex < sentences.length - 1) {
      // More sentences to go - use URL directly to avoid stale closure
      const nextIndex = currentSentenceIndex + 1
      setSearchParams({ phase: 'reading', sentence: String(nextIndex) }, { replace: false })
    } else {
      // All sentences completed
      setNodeState(nodeId, 'mastered')
      updateLevelProgress('sentences')

      // Check if this completes the entire level
      if (isLevelComplete('sentences')) {
        markLevelComplete('sentences')
        setShowLevelComplete(true)
      } else {
        setShowCelebration(true)
        playCelebrate()
        setTimeout(() => {
          navigate('/sentences')
        }, 3000)
      }
    }
  }, [currentSentenceIndex, sentences.length, setSearchParams, setNodeState, nodeId, navigate, playCelebrate, updateLevelProgress, isLevelComplete, markLevelComplete])

  // Handle back button
  const handleBack = () => {
    navigate('/sentences')
  }

  // Audio handlers
  const handlePlayWord = (index: number) => {
    if (currentSentence && isTTSEnabled()) {
      const word = currentSentence.words[index]
      play(getTTS(word, 'word')).catch(console.error)
    }
  }

  const handlePlaySentence = () => {
    if (currentSentence && isTTSEnabled()) {
      play(getTTS(currentSentence.sentence, 'sentence')).catch(console.error)
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

      {/* Level complete screen - sentences is the final level */}
      {showLevelComplete && (
        <LevelCompleteScreen
          levelId="sentences"
        />
      )}
    </div>
  )
}

export default SentenceGroupView
