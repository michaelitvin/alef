import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { StarBadge } from './StarBadge'

export interface AchievementCardProps {
  /** Title of the achievement */
  title: string
  /** Description text */
  description: string
  /** Icon or emoji */
  icon: string
  /** Whether the achievement is earned */
  earned: boolean
  /** Star rating (1-3) for earned achievements */
  stars?: 1 | 2 | 3
  /** Progress toward achievement (0-1) */
  progress?: number
  /** Date earned (if applicable) */
  earnedAt?: Date
}

/**
 * AchievementCard - Displays an achievement/badge with progress
 */
export function AchievementCard({
  title,
  description,
  icon,
  earned,
  stars = 1,
  progress = 0,
  earnedAt,
}: AchievementCardProps) {
  return (
    <motion.div
      style={{
        padding: spacing[4],
        backgroundColor: earned ? colors.surface : colors.neutral[50],
        borderRadius: borderRadius.xl,
        border: `2px solid ${earned ? colors.gold : colors.neutral[200]}`,
        boxShadow: earned ? shadows.glowGold : shadows.sm,
        opacity: earned ? 1 : 0.7,
        display: 'flex',
        gap: spacing[3],
        alignItems: 'center',
      }}
      whileHover={{ scale: earned ? 1.02 : 1 }}
    >
      {/* Icon */}
      <motion.div
        style={{
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: earned ? colors.gold : colors.neutral[200],
          borderRadius: borderRadius.full,
          fontSize: '2rem',
          filter: earned ? 'none' : 'grayscale(100%)',
        }}
        animate={earned ? { rotate: [0, 10, -10, 0] } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {icon}
      </motion.div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: earned ? colors.text.primary : colors.text.disabled,
            margin: 0,
            marginBottom: spacing[1],
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            margin: 0,
          }}
        >
          {description}
        </p>

        {/* Progress bar for unearned */}
        {!earned && progress > 0 && (
          <div
            style={{
              marginTop: spacing[2],
              height: '6px',
              backgroundColor: colors.neutral[200],
              borderRadius: borderRadius.full,
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{
                height: '100%',
                backgroundColor: colors.primary[400],
                borderRadius: borderRadius.full,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        {/* Date earned */}
        {earned && earnedAt && (
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.xs,
              color: colors.text.secondary,
              margin: 0,
              marginTop: spacing[1],
            }}
          >
            הושג ב-{earnedAt.toLocaleDateString('he-IL')}
          </p>
        )}
      </div>

      {/* Stars for earned achievements */}
      {earned && (
        <StarBadge stars={stars} size="sm" />
      )}
    </motion.div>
  )
}

export default AchievementCard
