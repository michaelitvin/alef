import { motion } from 'framer-motion'
import { colors, typography } from '../../styles/theme'

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg'
  /** Color of the spinner */
  color?: string
  /** Optional loading message */
  message?: string
  /** Show full-screen overlay */
  fullScreen?: boolean
}

const spinnerSizes = {
  sm: 24,
  md: 40,
  lg: 64,
}

/**
 * LoadingSpinner - Animated loading indicator
 * Child-friendly design with bouncing animation
 */
export function LoadingSpinner({
  size = 'md',
  color = colors.primary[500],
  message,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinnerSize = spinnerSizes[size]

  const spinner = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}
    >
      {/* Bouncing dots animation */}
      <div
        style={{
          display: 'flex',
          gap: spinnerSize / 4,
        }}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            animate={{
              y: [0, -spinnerSize / 2, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: index * 0.15,
              ease: 'easeInOut',
            }}
            style={{
              width: spinnerSize / 3,
              height: spinnerSize / 3,
              borderRadius: '50%',
              backgroundColor: color,
            }}
          />
        ))}
      </div>

      {message && (
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize:
              size === 'sm'
                ? typography.fontSize.sm
                : size === 'md'
                ? typography.fontSize.base
                : typography.fontSize.lg,
            color: colors.text.secondary,
            textAlign: 'center',
          }}
        >
          {message}
        </motion.p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
          zIndex: 50,
        }}
      >
        {spinner}
      </div>
    )
  }

  return spinner
}

/**
 * LetterLoadingSpinner - Shows a bouncing Hebrew letter
 */
export function LetterLoadingSpinner({
  letter = 'א',
  size = 'md',
}: {
  letter?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const letterSize = size === 'sm' ? '2rem' : size === 'md' ? '3rem' : '4rem'

  return (
    <motion.div
      animate={{
        y: [0, -20, 0],
        rotate: [0, 10, -10, 0],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        fontFamily: typography.fontFamily.hebrew,
        fontSize: letterSize,
        color: colors.primary[500],
        textAlign: 'center',
      }}
    >
      {letter}
    </motion.div>
  )
}

export default LoadingSpinner
