import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { TappableText } from '../../components/stories'
import { FeedbackOverlay, type FeedbackType } from '../../components/common/FeedbackOverlay'
import { useSoundEffects } from '../../hooks/useAudio'
import type { Story } from '../../types/story'

export interface StoryQuizViewProps {
  story: Story
  /** Called with per-question first-try correctness when all questions are answered */
  onComplete: (firstTryCorrect: boolean[]) => void
}

/**
 * StoryQuizView - one multiple-choice question at a time.
 * Tapping a word in the question/answers speaks it (stopPropagation in
 * TappableText); tapping an answer card outside a word selects the answer.
 */
export function StoryQuizView({ story, onComplete }: StoryQuizViewProps) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [storyOpen, setStoryOpen] = useState(false)
  const [wrongThisQuestion, setWrongThisQuestion] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const firstTryRef = useRef<boolean[]>([])
  const { playSuccess, playError } = useSoundEffects()

  const question = story.questions[questionIndex]

  const handleAnswer = (optionIndex: number) => {
    if (feedback === 'success') return

    if (optionIndex === question.correctIndex) {
      void playSuccess()
      firstTryRef.current[questionIndex] = !wrongThisQuestion
      setFeedback('success')
      setTimeout(() => {
        setFeedback(null)
        setWrongThisQuestion(false)
        if (questionIndex + 1 < story.questions.length) {
          setQuestionIndex(questionIndex + 1)
        } else {
          onComplete(firstTryRef.current)
        }
      }, 1200)
    } else {
      void playError()
      setWrongThisQuestion(true)
      setFeedback('error')
      setTimeout(() => setFeedback(null), 1000)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
        width: '100%',
        maxWidth: '600px',
      }}
    >
      {/* Collapsible story panel for peeking back */}
      <div
        style={{
          backgroundColor: colors.primary[50],
          borderRadius: borderRadius.xl,
          padding: spacing[3],
        }}
      >
        <button
          onClick={() => setStoryOpen(!storyOpen)}
          style={{
            border: 'none',
            background: 'none',
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.lg,
            color: colors.primary[700],
            cursor: 'pointer',
            width: '100%',
            direction: 'rtl',
            textAlign: 'right',
          }}
        >
          📖 הַסִּפּוּר {storyOpen ? '▲' : '▼'}
        </button>
        <AnimatePresence>
          {storyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              {story.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  style={{
                    direction: 'rtl',
                    textAlign: 'right',
                    lineHeight: 2.2,
                    margin: `${spacing[3]} 0 0 0`,
                  }}
                >
                  <TappableText
                    text={paragraph}
                    blockId={`peek-p${index}`}
                    fontSize={typography.fontSize.lg}
                    color={colors.text.primary}
                  />
                </p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Question */}
      <motion.div
        key={questionIndex}
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        style={{
          padding: spacing[4],
          backgroundColor: colors.surface,
          borderRadius: borderRadius['2xl'],
          boxShadow: shadows.lg,
        }}
      >
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            direction: 'rtl',
            margin: 0,
            marginBottom: spacing[2],
          }}
        >
          שְׁאֵלָה {questionIndex + 1} מִתּוֹךְ {story.questions.length}
        </p>
        <h2 style={{ direction: 'rtl', textAlign: 'right', margin: 0 }}>
          <TappableText
            text={question.question}
            blockId={`q${questionIndex}`}
            fontSize={typography.fontSize['2xl']}
            fontWeight={typography.fontWeight.bold}
            color={colors.text.primary}
          />
        </h2>
      </motion.div>

      {/* Answer cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {question.options.map((option, optionIndex) => (
          <motion.button
            key={`${questionIndex}-${optionIndex}`}
            onClick={() => handleAnswer(optionIndex)}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 * optionIndex }}
            style={{
              padding: spacing[4],
              borderRadius: borderRadius.xl,
              border: `2px solid ${colors.primary[200]}`,
              backgroundColor: colors.surface,
              boxShadow: shadows.sm,
              cursor: 'pointer',
              direction: 'rtl',
              textAlign: 'right',
            }}
            whileHover={{ scale: 1.02, backgroundColor: colors.primary[50] }}
            whileTap={{ scale: 0.97 }}
          >
            <TappableText
              text={option}
              blockId={`q${questionIndex}-o${optionIndex}`}
              fontSize={typography.fontSize.xl}
              color={colors.primary[700]}
            />
          </motion.button>
        ))}
      </div>

      <FeedbackOverlay
        visible={feedback !== null}
        type={feedback ?? 'success'}
        autoHideMs={0}
      />
    </div>
  )
}

export default StoryQuizView
