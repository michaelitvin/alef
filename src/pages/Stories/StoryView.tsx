import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { SpeechProvider, useSpeech } from '../../components/stories'
import { useProgressStore } from '../../stores/progressStore'
import { useSoundEffects } from '../../hooks/useAudio'
import storiesYaml from '../../data/stories.yaml'
import type { StoriesData, Story } from '../../types/story'
import { StoryReadView } from './StoryReadView'
import { StoryQuizView } from './StoryQuizView'

const { stories } = storiesYaml as StoriesData

/** Finishing the read phase with at most this many word taps earns the self-read badge */
const SELF_READ_MAX_TAPS = 5

/**
 * StoryView - a full story session: read -> quiz -> celebration.
 * Wraps everything in SpeechProvider so the tap cycle spans the screen.
 */
export function StoryView() {
  const { storyId } = useParams()
  const story = stories.find((s) => s.id === storyId)
  if (!story) return <Navigate to="/stories" replace />
  return (
    <SpeechProvider>
      <StorySession story={story} />
    </SpeechProvider>
  )
}

type Phase = 'read' | 'quiz' | 'done'

function StorySession({ story }: { story: Story }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('read')
  const [selfRead, setSelfRead] = useState(false)
  const { hebrewVoiceAvailable, tapCount } = useSpeech()
  const readTapsRef = useRef<number | null>(null)
  const initializeNode = useProgressStore((state) => state.initializeNode)
  const recordAttempt = useProgressStore((state) => state.recordAttempt)
  const setNodeState = useProgressStore((state) => state.setNodeState)
  const addReward = useProgressStore((state) => state.addReward)

  const handleQuizComplete = useCallback(
    (firstTryCorrect: boolean[]) => {
      const nodeId = `stories-${story.id}`
      initializeNode(nodeId, 'stories')
      firstTryCorrect.forEach((correct, index) => {
        recordAttempt(nodeId, {
          itemId: `${story.id}-q${index}`,
          correct,
          timeMs: 0,
          timestamp: Date.now(),
        })
      })
      setNodeState(nodeId, 'mastered')
      const earnedSelfRead = (readTapsRef.current ?? Infinity) <= SELF_READ_MAX_TAPS
      if (earnedSelfRead) addReward('story_self_read', story.id)
      setSelfRead(earnedSelfRead)
      setPhase('done')
    },
    [story.id, initializeNode, recordAttempt, setNodeState, addReward]
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: spacing[4],
        gap: spacing[4],
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          maxWidth: '600px',
        }}
      >
        <motion.button
          onClick={() => navigate('/stories')}
          style={{
            border: 'none',
            backgroundColor: colors.neutral[100],
            borderRadius: borderRadius.full,
            width: '44px',
            height: '44px',
            fontSize: '1.25rem',
            cursor: 'pointer',
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          →
        </motion.button>
      </header>

      {!hebrewVoiceAvailable && (
        <div
          style={{
            backgroundColor: colors.primary[50],
            borderRadius: borderRadius.xl,
            padding: spacing[3],
            maxWidth: '600px',
            width: '100%',
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            direction: 'rtl',
            textAlign: 'center',
          }}
        >
          🔇 אֵין קוֹל עִבְרִי בַּמַּכְשִׁיר הַזֶּה — אֶפְשָׁר לִקְרֹא בְּלִי שֶׁמַע
        </div>
      )}

      {phase === 'read' && (
        <StoryReadView
          story={story}
          onFinished={() => {
            readTapsRef.current = tapCount
            setPhase('quiz')
          }}
        />
      )}
      {phase === 'quiz' && (
        <StoryQuizView story={story} onComplete={handleQuizComplete} />
      )}
      {phase === 'done' && (
        <StoryCelebration selfRead={selfRead} onBack={() => navigate('/stories')} />
      )}
    </div>
  )
}

export function StoryCelebration({
  onBack,
  selfRead,
}: {
  onBack: () => void
  /** True when the story was read with almost no TTS help */
  selfRead: boolean
}) {
  const { playCelebrate } = useSoundEffects()

  useEffect(() => {
    void playCelebrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[5],
        padding: spacing[8],
        backgroundColor: colors.surface,
        borderRadius: borderRadius['2xl'],
        boxShadow: shadows.lg,
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
      }}
    >
      <motion.span
        style={{ fontSize: '5rem', lineHeight: 1 }}
        animate={{ rotate: [0, -10, 10, 0] }}
        transition={{ repeat: 2, duration: 0.6 }}
      >
        🎉
      </motion.span>
      <h1
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize['4xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.primary[600],
          margin: 0,
        }}
      >
        כָּל הַכָּבוֹד!
      </h1>
      {selfRead && (
        <motion.div
          initial={{ scale: 0, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 14 }}
          style={{
            padding: `${spacing[2]} ${spacing[5]}`,
            backgroundColor: colors.secondary[100],
            borderRadius: borderRadius.full,
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.secondary[800],
            direction: 'rtl',
          }}
        >
          ⭐ קָרָאתָ לְבַד! ⭐
        </motion.div>
      )}
      <p
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.xl,
          color: colors.text.secondary,
          margin: 0,
        }}
      >
        סִיַּמְתָּ אֶת הַסִּפּוּר וְעָנִיתָ עַל כָּל הַשְּׁאֵלוֹת!
      </p>
      <motion.button
        onClick={onBack}
        style={{
          padding: `${spacing[3]} ${spacing[6]}`,
          borderRadius: borderRadius.xl,
          border: 'none',
          backgroundColor: colors.primary[500],
          boxShadow: shadows.md,
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: colors.surface,
          cursor: 'pointer',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        עוֹד סִפּוּר 📚
      </motion.button>
    </motion.div>
  )
}

export default StoryView
