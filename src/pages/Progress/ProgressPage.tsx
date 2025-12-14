import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { Header } from '../../components/navigation/Navigation'
import { ProgressRing } from '../../components/rewards/ProgressRing'
import { AchievementCard } from '../../components/rewards/AchievementCard'
import { useProgressStore } from '../../stores/progressStore'
import { useResponsive } from '../../hooks/useResponsive'

// Achievement definitions
const ACHIEVEMENTS = [
  {
    id: 'first-letter',
    title: 'אות ראשונה',
    description: 'למדת את האות הראשונה',
    icon: 'א',
    requirement: { type: 'letters', count: 1 },
  },
  {
    id: 'five-letters',
    title: 'חמש אותיות',
    description: 'למדת 5 אותיות',
    icon: '🌟',
    requirement: { type: 'letters', count: 5 },
  },
  {
    id: 'ten-letters',
    title: 'עשר אותיות',
    description: 'למדת 10 אותיות',
    icon: '🏆',
    requirement: { type: 'letters', count: 10 },
  },
  {
    id: 'all-letters',
    title: 'כל האותיות!',
    description: 'למדת את כל 27 האותיות',
    icon: '👑',
    requirement: { type: 'letters', count: 27 },
  },
  {
    id: 'first-nikkud',
    title: 'ניקוד ראשון',
    description: 'למדת סימן ניקוד ראשון',
    icon: 'בָ',
    requirement: { type: 'nikkud', count: 1 },
  },
  {
    id: 'all-nikkud',
    title: 'מומחה ניקוד',
    description: 'למדת את כל סימני הניקוד',
    icon: '📚',
    requirement: { type: 'nikkud', count: 8 },
  },
  {
    id: 'first-word',
    title: 'מילה ראשונה',
    description: 'קראת את המילה הראשונה',
    icon: '📖',
    requirement: { type: 'words', count: 1 },
  },
  {
    id: 'reader',
    title: 'קורא מתחיל',
    description: 'קראת 10 מילים',
    icon: '📗',
    requirement: { type: 'words', count: 10 },
  },
  {
    id: 'accuracy-star',
    title: 'דיוק כוכבי',
    description: 'השגת 90% דיוק',
    icon: '🎯',
    requirement: { type: 'accuracy', value: 0.9 },
  },
  {
    id: 'sessions-3',
    title: '3 מפגשים',
    description: 'למדת 3 מפגשים',
    icon: '🔥',
    requirement: { type: 'sessions', count: 3 },
  },
] as const

/**
 * ProgressPage - Shows learning progress, stats, and achievements
 */
export function ProgressPage() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const stats = useProgressStore((state) => state.stats)
  const levels = useProgressStore((state) => state.levels)

  // Calculate level progress
  const lettersLearned = stats.lettersLearned
  const totalLetters = 27
  const lettersProgress = lettersLearned / totalLetters

  // Use nodesMastered from level progress
  const nikkudMastered = levels.nikkud?.nodesMastered || 0
  const wordsMastered = levels.words?.nodesMastered || 0
  const sentencesMastered = levels.sentences?.nodesMastered || 0

  // Check achievements
  const checkAchievement = (achievement: typeof ACHIEVEMENTS[number]) => {
    const req = achievement.requirement
    switch (req.type) {
      case 'letters':
        return lettersLearned >= req.count
      case 'nikkud':
        return nikkudMastered >= req.count
      case 'words':
        return wordsMastered >= req.count
      case 'accuracy':
        return stats.accuracy >= req.value
      case 'sessions':
        return stats.sessionCount >= req.count
      default:
        return false
    }
  }

  const getAchievementProgress = (achievement: typeof ACHIEVEMENTS[number]) => {
    const req = achievement.requirement
    switch (req.type) {
      case 'letters':
        return Math.min(lettersLearned / req.count, 1)
      case 'nikkud':
        return Math.min(nikkudMastered / req.count, 1)
      case 'words':
        return Math.min(wordsMastered / req.count, 1)
      case 'accuracy':
        return Math.min(stats.accuracy / req.value, 1)
      case 'sessions':
        return Math.min(stats.sessionCount / req.count, 1)
      default:
        return 0
    }
  }

  const handleBack = () => {
    navigate('/')
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
        title="ההתקדמות שלי"
        subtitle="צפה בהישגים ובסטטיסטיקות"
        showBack
        onBack={handleBack}
      />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: spacing[4],
          gap: spacing[6],
          maxWidth: '600px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Overall progress rings */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: spacing[6],
            flexWrap: 'wrap',
          }}
        >
          <ProgressRing
            progress={lettersProgress}
            label={`${lettersLearned}`}
            sublabel="אותיות"
            color={colors.primary[500]}
          />
          <ProgressRing
            progress={stats.accuracy}
            label={`${Math.round(stats.accuracy * 100)}%`}
            sublabel="דיוק"
            color={colors.success[500]}
          />
        </motion.section>

        {/* Quick stats */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: borderRadius.xl,
            padding: spacing[4],
            boxShadow: shadows.md,
          }}
        >
          <h2
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing[4],
              textAlign: 'center',
            }}
          >
            סטטיסטיקות
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: spacing[4],
            }}
          >
            <StatItem icon="📝" label="ניסיונות" value={stats.totalAttempts} />
            <StatItem icon="✓" label="הצלחות" value={stats.totalCorrect} />
            <StatItem icon="🔥" label="רצף מקסימלי" value={stats.bestStreak} />
            <StatItem icon="⏱️" label="מפגשים" value={stats.sessionCount} />
          </div>
        </motion.section>

        {/* Level progress */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: borderRadius.xl,
            padding: spacing[4],
            boxShadow: shadows.md,
          }}
        >
          <h2
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing[4],
              textAlign: 'center',
            }}
          >
            התקדמות ברמות
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            <LevelProgressBar label="אותיות" progress={lettersProgress} icon="א" />
            <LevelProgressBar label="ניקוד" progress={nikkudMastered / 8} icon="בָ" />
            <LevelProgressBar label="מילים" progress={wordsMastered / 8} icon="📖" />
            <LevelProgressBar label="משפטים" progress={sentencesMastered / 6} icon="📝" />
          </div>
        </motion.section>

        {/* Achievements */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing[4],
              textAlign: 'center',
            }}
          >
            הישגים
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            {ACHIEVEMENTS.map((achievement) => {
              const earned = checkAchievement(achievement)
              const progress = getAchievementProgress(achievement)

              return (
                <AchievementCard
                  key={achievement.id}
                  title={achievement.title}
                  description={achievement.description}
                  icon={achievement.icon}
                  earned={earned}
                  progress={progress}
                  stars={earned ? (progress >= 1 ? 3 : 2) : 1}
                />
              )
            })}
          </div>
        </motion.section>
      </main>
    </div>
  )
}

// Helper components
function StatItem({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: spacing[2],
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <p
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: 0,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          margin: 0,
        }}
      >
        {label}
      </p>
    </div>
  )
}

function LevelProgressBar({
  label,
  progress,
  icon,
}: {
  label: string
  progress: number
  icon: string
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[1],
        }}
      >
        <span
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
          }}
        >
          {icon} {label}
        </span>
        <span
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
          }}
        >
          {Math.round(progress * 100)}%
        </span>
      </div>
      <div
        style={{
          height: '10px',
          backgroundColor: colors.neutral[200],
          borderRadius: borderRadius.full,
          overflow: 'hidden',
        }}
      >
        <motion.div
          style={{
            height: '100%',
            backgroundColor: colors.primary[500],
            borderRadius: borderRadius.full,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  )
}

export default ProgressPage
