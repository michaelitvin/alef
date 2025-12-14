import { motion } from 'framer-motion'
import { colors, typography, borderRadius, shadows } from '../../styles/theme'

export type NodeState = 'locked' | 'available' | 'in_progress' | 'mastered'

export interface NodeIconProps {
  /** Label to display (letter character, etc.) */
  label: string
  /** Current state of the node */
  state: NodeState
  /** Whether this node is currently active/selected */
  isActive?: boolean
  /** Click handler */
  onClick?: () => void
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

const sizeConfig = {
  sm: { outer: 48, inner: 40, font: '1.25rem' },
  md: { outer: 64, inner: 54, font: '1.75rem' },
  lg: { outer: 80, inner: 68, font: '2.25rem' },
}

const stateColors: Record<NodeState, { bg: string; border: string; text: string }> = {
  locked: {
    bg: colors.neutral[100],
    border: colors.neutral[300],
    text: colors.neutral[400],
  },
  available: {
    bg: colors.surface,
    border: colors.primary[400],
    text: colors.primary[600],
  },
  in_progress: {
    bg: colors.primary[50],
    border: colors.primary[500],
    text: colors.primary[600],
  },
  mastered: {
    bg: colors.success[50],
    border: colors.success[500],
    text: colors.success[700],
  },
}

/**
 * NodeIcon - A single node on the journey path
 * Shows letter label with state-based styling
 */
export function NodeIcon({
  label,
  state,
  isActive = false,
  onClick,
  size = 'md',
}: NodeIconProps) {
  const config = sizeConfig[size]
  const stateStyle = stateColors[state]
  const isClickable = state !== 'locked'

  return (
    <motion.button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      style={{
        width: config.outer,
        height: config.outer,
        borderRadius: borderRadius.full,
        border: 'none',
        padding: 0,
        backgroundColor: 'transparent',
        cursor: isClickable ? 'pointer' : 'not-allowed',
        position: 'relative',
      }}
      whileHover={isClickable ? { scale: 1.1 } : undefined}
      whileTap={isClickable ? { scale: 0.95 } : undefined}
      animate={
        state === 'available'
          ? {
              scale: [1, 1.05, 1],
              transition: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut' as const,
              },
            }
          : state === 'in_progress'
          ? {
              boxShadow: [
                `0 0 0 0 ${colors.primary[300]}`,
                `0 0 0 8px ${colors.primary[100]}`,
                `0 0 0 0 ${colors.primary[300]}`,
              ],
              transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut' as const,
              },
            }
          : undefined
      }
    >
      {/* Outer ring */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: borderRadius.full,
          border: `3px solid ${isActive ? colors.primary[500] : stateStyle.border}`,
          backgroundColor: stateStyle.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isActive ? shadows.glow : shadows.sm,
        }}
      >
        {/* Inner content */}
        {state === 'locked' ? (
          <span style={{ fontSize: config.font }}>🔒</span>
        ) : (
          <span
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: config.font,
              fontWeight: typography.fontWeight.bold,
              color: stateStyle.text,
              lineHeight: 1,
            }}
          >
            {label}
          </span>
        )}
      </div>

      {/* Mastered checkmark badge */}
      {state === 'mastered' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 24,
            height: 24,
            borderRadius: borderRadius.full,
            backgroundColor: colors.success[500],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.sm,
          }}
        >
          <span style={{ color: 'white', fontSize: '0.875rem' }}>✓</span>
        </motion.div>
      )}
    </motion.button>
  )
}

export default NodeIcon
