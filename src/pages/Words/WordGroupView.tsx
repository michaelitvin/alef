import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, typography, spacing } from '../../styles/theme'
import { WordIntro } from '../../components/words/WordIntro'
import { SyllableBreakdown } from '../../components/words/SyllableBreakdown'
import { WordQuiz, type WordQuizOption } from '../../components/words/WordQuiz'
import { FeedbackOverlay } from '../../components/common/FeedbackOverlay'
import { Header } from '../../components/navigation/Navigation'
import { useProgressStore } from '../../stores/progressStore'
import { useAudio } from '../../hooks/useAudio'
import { importYaml } from '../../utils/yaml'
import { useResponsive } from '../../hooks/useResponsive'

// Word data structure from YAML
interface WordData {
  id: string
  word: string
  syllables: string[]
  translation: string
  category: string
  difficulty: number
  audioWord: string
}

interface WordsYaml {
  words: WordData[]
}

// Word groups matching WordsPage.tsx
const WORD_GROUPS = [
  { id: 'family', name: 'משפחה', icon: '👨‍👩‍👧‍👦', words: ['ima', 'aba'] },
  { id: 'people', name: 'אנשים', icon: '👦', words: ['yeled', 'yalda'] },
  { id: 'animals', name: 'חיות', icon: '🐾', words: ['kelev', 'chatul'] },
  { id: 'home', name: 'בית', icon: '🏠', words: ['bait', 'sefer'] },
  { id: 'nature', name: 'טבע', icon: '🌳', words: ['shemesh', 'mayim'] },
  { id: 'food', name: 'אוכל', icon: '🍎', words: ['lechem', 'tapuach', 'chalav'] },
  { id: 'actions', name: 'פעולות', icon: '🏃', words: ['holeech', 'ratz', 'yoshev'] },
  { id: 'colors', name: 'צבעים', icon: '🎨', words: ['adom', 'yarok', 'kachol'] },
]

type LearningStep = 'intro' | 'breakdown' | 'quiz'

/**
 * WordGroupView - Learning experience for a group of words
 * Cycles through: WordIntro → SyllableBreakdown → WordQuiz for each word
 */
export function WordGroupView() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isMobile } = useResponsive()
  const { play } = useAudio()

  // Get step and word index from URL (enables browser back button)
  const urlStep = searchParams.get('step') as LearningStep | null
  const urlWordIndex = searchParams.get('word')
  const currentStep: LearningStep = urlStep || 'intro'
  const currentWordIndex = urlWordIndex ? parseInt(urlWordIndex, 10) : 0

  // Helper to change step via URL
  const setCurrentStep = useCallback((newStep: LearningStep) => {
    setSearchParams({ step: newStep, word: String(currentWordIndex) }, { replace: false })
  }, [setSearchParams, currentWordIndex])

  // Helper to change word index via URL
  const setCurrentWordIndex = useCallback((newIndex: number | ((prev: number) => number)) => {
    const resolvedIndex = typeof newIndex === 'function' ? newIndex(currentWordIndex) : newIndex
    setSearchParams({ step: 'intro', word: String(resolvedIndex) }, { replace: false })
  }, [setSearchParams, currentWordIndex])

  const [wordsData, setWordsData] = useState<WordData[]>([])
  const [loading, setLoading] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)
  const [allWordsComplete, setAllWordsComplete] = useState(false)

  const recordAttempt = useProgressStore((state) => state.recordAttempt)
  const addToVocabulary = useProgressStore((state) => state.addToVocabulary)
  const updateLevelProgress = useProgressStore((state) => state.updateLevelProgress)
  const checkLevelUnlock = useProgressStore((state) => state.checkLevelUnlock)

  // Find the word group
  const wordGroup = WORD_GROUPS.find((g) => g.id === groupId)
  const nodeId = `words-${groupId}`

  // Load words from YAML
  useEffect(() => {
    async function loadWords() {
      try {
        setLoading(true)
        const data = await importYaml<WordsYaml>(() => import('../../data/words.yaml'))

        // Filter words for this group
        if (wordGroup) {
          const groupWords = data.words.filter((w) => wordGroup.words.includes(w.id))
          setWordsData(groupWords)

          // Set initial URL state if not present
          if (!urlStep) {
            setSearchParams({ step: 'intro', word: '0' }, { replace: true })
          }
        }
      } catch (error) {
        console.error('Failed to load words:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWords()
  }, [groupId, wordGroup, urlStep, setSearchParams])

  // Get current word
  const currentWord = wordsData[currentWordIndex]

  // Play word audio
  const playWord = useCallback(() => {
    if (currentWord) {
      play(`/assets/audio/${currentWord.audioWord}`)
    }
  }, [currentWord, play])

  // Play syllable audio
  const playSyllable = useCallback(
    (index: number) => {
      if (currentWord && currentWord.syllables[index]) {
        // For now, play the full word (individual syllable audio would need to be added to YAML)
        playWord()
      }
    },
    [currentWord, playWord]
  )

  // Handle intro continue
  const handleIntroContinue = useCallback(() => {
    setCurrentStep('breakdown')
  }, [])

  // Handle breakdown complete
  const handleBreakdownComplete = useCallback(() => {
    setCurrentStep('quiz')
  }, [])

  // Handle quiz answer
  const handleQuizAnswer = useCallback(
    (isCorrect: boolean) => {
      // Record attempt
      if (currentWord) {
        recordAttempt(nodeId, {
          timestamp: Date.now(),
          correct: isCorrect,
          itemId: currentWord.id,
          timeMs: 0,
        })
      }
    },
    [currentWord, nodeId, recordAttempt]
  )

  // Handle quiz complete
  const handleQuizComplete = useCallback(() => {
    if (currentWord) {
      // Add word to vocabulary
      addToVocabulary(currentWord.id)
    }

    // Check if there are more words
    if (currentWordIndex < wordsData.length - 1) {
      // Move to next word
      setCurrentWordIndex((prev) => prev + 1)
      setCurrentStep('intro')
    } else {
      // All words complete
      setAllWordsComplete(true)
      setShowCelebration(true)

      // Update progress
      updateLevelProgress('words')
      checkLevelUnlock()

      // Navigate back after celebration
      setTimeout(() => {
        navigate('/words')
      }, 3000)
    }
  }, [
    currentWord,
    currentWordIndex,
    wordsData.length,
    addToVocabulary,
    updateLevelProgress,
    checkLevelUnlock,
    navigate,
  ])

  // Handle back button
  const handleBack = useCallback(() => {
    navigate('/words')
  }, [navigate])

  // Generate quiz options for current word
  const generateQuizOptions = useCallback((): WordQuizOption[] => {
    if (!currentWord || wordsData.length === 0) return []

    // Get other words as distractors
    const otherWords = wordsData.filter((w) => w.id !== currentWord.id)

    // Randomly select 2 distractors
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5)
    const distractors = shuffled.slice(0, 2)

    // Create options
    const options: WordQuizOption[] = [
      {
        word: currentWord.word,
        syllables: currentWord.syllables,
        isCorrect: true,
      },
      ...distractors.map((w) => ({
        word: w.word,
        syllables: w.syllables,
        isCorrect: false,
      })),
    ]

    // Shuffle options
    return options.sort(() => Math.random() - 0.5)
  }, [currentWord, wordsData])

  if (loading) {
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

  if (!wordGroup || wordsData.length === 0) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: colors.background,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[4],
        }}
      >
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.xl,
            color: colors.text.primary,
            textAlign: 'center',
          }}
        >
          קבוצת מילים לא נמצאה
        </p>
        <button
          onClick={handleBack}
          style={{
            marginTop: spacing[4],
            padding: `${spacing[3]} ${spacing[6]}`,
            backgroundColor: colors.primary[500],
            color: colors.surface,
            border: 'none',
            borderRadius: '12px',
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.lg,
            cursor: 'pointer',
          }}
        >
          חזור
        </button>
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
        paddingBottom: isMobile ? '80px' : '0',
      }}
    >
      <Header
        title={`${wordGroup.icon} ${wordGroup.name}`}
        subtitle={`מילה ${currentWordIndex + 1} מתוך ${wordsData.length}`}
        showBack
        onBack={handleBack}
      />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: spacing[4],
        }}
      >
        <AnimatePresence mode="wait">
          {currentWord && (
            <motion.div
              key={`${currentWord.id}-${currentStep}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 'intro' && (
                <WordIntro
                  word={currentWord.word}
                  syllables={currentWord.syllables}
                  translation={currentWord.translation}
                  onPlayWord={playWord}
                  onPlaySyllable={playSyllable}
                  onContinue={handleIntroContinue}
                />
              )}

              {currentStep === 'breakdown' && (
                <SyllableBreakdown
                  word={currentWord.word}
                  syllables={currentWord.syllables}
                  onSyllableClick={playSyllable}
                  onPlayWord={playWord}
                  onComplete={handleBreakdownComplete}
                  mode="practice"
                />
              )}

              {currentStep === 'quiz' && (
                <WordQuiz
                  prompt={`בחר את המילה: "${currentWord.translation}"`}
                  options={generateQuizOptions()}
                  onAnswer={handleQuizAnswer}
                  onComplete={handleQuizComplete}
                  onPlaySound={playWord}
                  translationHint={currentWord.translation}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: spacing[6],
            display: 'flex',
            justifyContent: 'center',
            gap: spacing[2],
          }}
        >
          {wordsData.map((_, index) => (
            <div
              key={index}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor:
                  index < currentWordIndex
                    ? colors.success[400]
                    : index === currentWordIndex
                      ? colors.primary[500]
                      : colors.neutral[300],
              }}
            />
          ))}
        </motion.div>
      </main>

      {/* Completion celebration */}
      <FeedbackOverlay
        visible={showCelebration && allWordsComplete}
        type="celebration"
        message={`כל הכבוד! למדת ${wordsData.length} מילים חדשות!`}
        autoHideMs={3000}
        onHide={() => setShowCelebration(false)}
      />
    </div>
  )
}

export default WordGroupView
