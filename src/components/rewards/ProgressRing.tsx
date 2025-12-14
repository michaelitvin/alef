import { motion } from 'framer-motion'
import { colors, typography } from '../../styles/theme'

export interface ProgressRingProps {
  /** Progress value from 0 to 1 */
  progress: number
  /** Size of the ring in pixels */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Color of the progress ring */
  color?: string
  /** Label inside the ring */
  label?: string
  /** Secondary label (e.g., percentage) */
  sublabel?: string
  /** Whether to animate on mount */
  animate?: boolean
}

/**
 * ProgressRing - Circular progress indicator
 */
export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = colors.primary[500],
  label,
  sublabel,
  animate = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - progress * circumference

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
      }}
    >
      {/* Background circle */}
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.neutral[200]}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {label && (
          <span
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            {label}
          </span>
        )}
        {sublabel && (
          <span
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}

export default ProgressRing
