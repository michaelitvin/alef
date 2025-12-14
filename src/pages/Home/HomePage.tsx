import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { useProgressStore } from '../../stores/progressStore'
import { useResponsive } from '../../hooks/useResponsive'

interface LevelInfo {
  id: 'letters' | 'nikkud' | 'words' | 'sentences'
  name: string
  description: string
  icon: string
  path: string
}

const LEVELS: LevelInfo[] = [
  {
    id: 'letters',
    name: 'אותיות',
    description: 'למד את האותיות העבריות',
    icon: 'א',
    path: '/letters',
  },
  {
    id: 'nikkud',
    name: 'ניקוד',
    description: 'למד את הניקוד',
    icon: 'בָ',
    path: '/nikkud',
  },
  {
    id: 'words',
    name: 'מילים',
    description: 'קרא מילים פשוטות',
    icon: '📖',
    path: '/words',
  },
  {
    id: 'sentences',
    name: 'משפטים',
    description: 'קרא משפטים קצרים',
    icon: '📝',
    path: '/sentences',
  },
]

/**
 * HomePage - Main landing page with level selection
 */
export function HomePage() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const isLevelUnlocked = useProgressStore((state) => state.isLevelUnlocked)
  const stats = useProgressStore((state) => state.stats)
  const startSession = useProgressStore((state) => state.startSession)

  // Start session on first visit
  if (!stats.lastSessionAt) {
    startSession()
  }

  const handleLevelClick = (level: LevelInfo) => {
    if (isLevelUnlocked(level.id)) {
      navigate(level.path)
    }
  }

  const gridColumns = isMobile ? 1 : isTablet ? 2 : 2

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: isMobile ? '100px' : spacing[8],
      }}
    >
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          textAlign: 'center',
          padding: `${spacing[8]} ${spacing[4]}`,
          width: '100%',
        }}
      >
        <h1
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: isMobile ? typography.fontSize['4xl'] : typography.fontSize['5xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[600],
            marginBottom: spacing[2],
          }}
        >
          אָלֶף
        </h1>
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['2xl'],
            color: colors.text.secondary,
          }}
        >
          לומדים לקרוא בעברית!
        </p>
      </motion.header>

      {/* Welcome message for new users */}
      {stats.sessionCount <= 1 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            backgroundColor: colors.primary[50],
            borderRadius: borderRadius.xl,
            padding: spacing[4],
            margin: `0 ${spacing[4]}`,
            maxWidth: '400px',
            textAlign: 'center',
            marginBottom: spacing[6],
          }}
        >
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.lg,
              color: colors.primary[700],
            }}
          >
            👋 שלום! בואו נלמד לקרוא בעברית!
          </p>
        </motion.div>
      )}

      {/* Level cards */}
      <main
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: spacing[4],
          padding: `0 ${spacing[4]}`,
          maxWidth: '600px',
          width: '100%',
        }}
      >
        {LEVELS.map((level, index) => {
          const unlocked = isLevelUnlocked(level.id)
          const levelProgress = useProgressStore.getState().levels[level.id]
          const progress = levelProgress?.successRate || 0

          return (
            <motion.div
              key={level.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
            >
              <LevelCard
                level={level}
                unlocked={unlocked}
                progress={progress}
                onClick={() => handleLevelClick(level)}
              />
            </motion.div>
          )
        })}
      </main>

      {/* Stats summary - clickable to go to progress page */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: spacing[8],
          textAlign: 'center',
        }}
      >
        <motion.button
          onClick={() => navigate('/progress')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: spacing[3],
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              margin: 0,
            }}
          >
            {stats.totalAttempts > 0 ? (
              <>
                ⭐ {stats.lettersLearned} אותיות נלמדו | 🎯{' '}
                {Math.round(stats.accuracy * 100)}% דיוק
              </>
            ) : (
              '📊 צפה בהתקדמות'
            )}
          </p>
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.xs,
              color: colors.primary[500],
              margin: 0,
              marginTop: spacing[1],
            }}
          >
            לחץ לצפייה בהישגים ←
          </p>
        </motion.button>
      </motion.div>
    </div>
  )
}

interface LevelCardProps {
  level: LevelInfo
  unlocked: boolean
  progress: number
  onClick: () => void
}

function LevelCard({ level, unlocked, progress, onClick }: LevelCardProps) {
  return (
    <motion.button
      onClick={unlocked ? onClick : undefined}
      style={{
        width: '100%',
        padding: spacing[5],
        borderRadius: borderRadius['2xl'],
        border: `2px solid ${unlocked ? colors.primary[200] : colors.neutral[200]}`,
        backgroundColor: unlocked ? colors.surface : colors.neutral[50],
        cursor: unlocked ? 'pointer' : 'not-allowed',
        opacity: unlocked ? 1 : 0.6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[3],
        boxShadow: unlocked ? shadows.md : 'none',
        textAlign: 'center',
      }}
      whileHover={unlocked ? { scale: 1.02, boxShadow: shadows.lg } : undefined}
      whileTap={unlocked ? { scale: 0.98 } : undefined}
    >
      {/* Icon */}
      <span
        style={{
          fontSize: '3rem',
          lineHeight: 1,
        }}
      >
        {unlocked ? level.icon : '🔒'}
      </span>

      {/* Name */}
      <h3
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: unlocked ? colors.text.primary : colors.text.disabled,
          margin: 0,
        }}
      >
        {level.name}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          margin: 0,
        }}
      >
        {unlocked ? level.description : 'סיים את הרמה הקודמת'}
      </p>

      {/* Progress bar (if unlocked and has progress) */}
      {unlocked && progress > 0 && (
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: colors.neutral[200],
            borderRadius: borderRadius.full,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            style={{
              height: '100%',
              backgroundColor: colors.success[500],
              borderRadius: borderRadius.full,
            }}
          />
        </div>
      )}
    </motion.button>
  )
}

export default HomePage
