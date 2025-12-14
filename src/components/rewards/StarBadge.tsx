import { motion } from 'framer-motion'
import { colors, typography, spacing } from '../../styles/theme'

export interface StarBadgeProps {
  /** Number of stars to display (1-3) */
  stars: 1 | 2 | 3
  /** Label to show below stars */
  label?: string
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to animate the stars */
  animate?: boolean
}

const sizeConfig = {
  sm: { star: '1.5rem', gap: spacing[1] },
  md: { star: '2rem', gap: spacing[2] },
  lg: { star: '3rem', gap: spacing[3] },
}

/**
 * StarBadge - Shows 1-3 stars for achievement levels
 */
export function StarBadge({ stars, label, size = 'md', animate = false }: StarBadgeProps) {
  const config = sizeConfig[size]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[1],
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: config.gap,
        }}
      >
        {[1, 2, 3].map((starNum) => {
          const filled = starNum <= stars

          return (
            <motion.span
              key={starNum}
              style={{
                fontSize: config.star,
                color: filled ? colors.star : colors.neutral[300],
                filter: filled ? 'drop-shadow(0 0 8px rgba(255, 193, 7, 0.5))' : 'none',
              }}
              initial={animate && filled ? { scale: 0, rotate: -180 } : {}}
              animate={animate && filled ? { scale: 1, rotate: 0 } : {}}
              transition={{
                delay: starNum * 0.2,
                type: 'spring',
                stiffness: 200,
              }}
            >
              ⭐
            </motion.span>
          )
        })}
      </div>

      {label && (
        <span
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

export default StarBadge
