import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import { colors, typography, borderRadius, shadows } from '../../styles/theme'

export type LetterCardSize = 'sm' | 'md' | 'lg' | 'xl'

export interface LetterCardProps {
  /** The Hebrew letter character */
  letter: string
  /** Optional nikkud (vowel mark) to display with the letter */
  nikkud?: string
  /** Size of the card */
  size?: LetterCardSize
  /** Whether the card is selected/active */
  selected?: boolean
  /** Whether the card is disabled */
  disabled?: boolean
  /** Whether to show a glowing effect */
  showGlow?: boolean
  /** Whether the card is correct (shows success state) */
  isCorrect?: boolean
  /** Whether the card is incorrect (shows error state) */
  isIncorrect?: boolean
  /** Click handler */
  onClick?: () => void
  /** Animation state */
  animate?: 'idle' | 'bounce' | 'wiggle' | 'pulse'
}

const sizeConfig: Record<LetterCardSize, { card: string; font: string }> = {
  sm: { card: '80px', font: '3rem' },
  md: { card: '100px', font: '4rem' },
  lg: { card: '140px', font: '6rem' },
  xl: { card: '180px', font: '8rem' },
}

const animationVariants = {
  idle: {},
  bounce: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
  wiggle: {
    rotate: [0, -5, 5, -5, 5, 0],
    transition: {
      duration: 0.5,
    },
  },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
}

/**
 * LetterCard - Displays a Hebrew letter with optional nikkud
 * Used for letter introduction, quizzes, and matching activities
 */
export const LetterCard = forwardRef<HTMLDivElement, LetterCardProps>(
  (
    {
      letter,
      nikkud,
      size = 'lg',
      selected = false,
      disabled = false,
      showGlow = false,
      isCorrect = false,
      isIncorrect = false,
      onClick,
      animate = 'idle',
    },
    ref
  ) => {
    const displayText = nikkud ? `${letter}${nikkud}` : letter
    const config = sizeConfig[size]

    // Determine border and shadow based on state
    let borderColor = 'transparent'
    let shadow = shadows.md

    if (selected) {
      borderColor = colors.primary[500]
      shadow = shadows.glow
    }
    if (isCorrect) {
      borderColor = colors.success[500]
      shadow = shadows.glowSuccess
    }
    if (isIncorrect) {
      borderColor = colors.error[400]
    }
    if (showGlow && !isCorrect && !isIncorrect) {
      shadow = shadows.glow
    }

    const cardStyle: React.CSSProperties = {
      width: config.card,
      height: config.card,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius['2xl'],
      border: `3px solid ${borderColor}`,
      boxShadow: shadow,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }

    const letterStyle: React.CSSProperties = {
      fontFamily: typography.fontFamily.hebrew,
      fontSize: config.font,
      lineHeight: 1,
      color: colors.text.primary,
      letterSpacing: nikkud ? '0.1em' : '0',
    }

    return (
      <motion.div
        ref={ref}
        style={cardStyle}
        onClick={disabled ? undefined : onClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`אות ${letter}`}
        aria-pressed={selected}
        aria-disabled={disabled}
        animate={animate !== 'idle' ? animationVariants[animate] : undefined}
        whileHover={disabled ? undefined : { scale: 1.05 }}
        whileTap={disabled ? undefined : { scale: 0.95 }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onClick && !disabled) {
            e.preventDefault()
            onClick()
          }
        }}
      >
        <span style={letterStyle} className="hebrew-letter">
          {displayText}
        </span>
      </motion.div>
    )
  }
)

LetterCard.displayName = 'LetterCard'

export default LetterCard
