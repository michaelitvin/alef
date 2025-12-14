import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import { colors, typography, borderRadius, shadows, spacing } from '../../styles/theme'

export type SentenceCardSize = 'sm' | 'md' | 'lg'

export interface SentenceCardProps {
  /** The Hebrew sentence to display */
  sentence: string
  /** Individual words in the sentence */
  words?: string[]
  /** Size of the card */
  size?: SentenceCardSize
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
  /** Click handler for individual words */
  onWordClick?: (index: number) => void
  /** Whether to show word breakdown */
  showWords?: boolean
  /** Animation state */
  animate?: 'idle' | 'bounce' | 'wiggle' | 'pulse'
}

const sizeConfig: Record<SentenceCardSize, { padding: string; font: string; wordFont: string }> = {
  sm: { padding: spacing[3], font: typography.fontSize.xl, wordFont: typography.fontSize.lg },
  md: { padding: spacing[4], font: typography.fontSize['2xl'], wordFont: typography.fontSize.xl },
  lg: { padding: spacing[5], font: typography.fontSize['3xl'], wordFont: typography.fontSize['2xl'] },
}

const animationVariants = {
  idle: {},
  bounce: {
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
  wiggle: {
    rotate: [0, -2, 2, -2, 2, 0],
    transition: {
      duration: 0.5,
    },
  },
  pulse: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
}

/**
 * SentenceCard - Displays a Hebrew sentence with optional word breakdown
 * Used for sentence introduction, reading practice, and quizzes
 */
export const SentenceCard = forwardRef<HTMLDivElement, SentenceCardProps>(
  (
    {
      sentence,
      words,
      size = 'md',
      selected = false,
      disabled = false,
      showGlow = false,
      isCorrect = false,
      isIncorrect = false,
      onClick,
      onWordClick,
      showWords = false,
      animate = 'idle',
    },
    ref
  ) => {
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
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: config.padding,
      backgroundColor: colors.surface,
      borderRadius: borderRadius['2xl'],
      border: `3px solid ${borderColor}`,
      boxShadow: shadow,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      gap: spacing[3],
      width: '100%',
    }

    const sentenceStyle: React.CSSProperties = {
      fontFamily: typography.fontFamily.hebrew,
      fontSize: config.font,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: 1.6,
      color: colors.text.primary,
      textAlign: 'center',
      direction: 'rtl',
    }

    return (
      <motion.div
        ref={ref}
        style={cardStyle}
        onClick={disabled ? undefined : onClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`משפט: ${sentence}`}
        aria-pressed={selected}
        aria-disabled={disabled}
        animate={animate !== 'idle' ? animationVariants[animate] : undefined}
        whileHover={disabled ? undefined : { scale: 1.01 }}
        whileTap={disabled ? undefined : { scale: 0.99 }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onClick && !disabled) {
            e.preventDefault()
            onClick()
          }
        }}
      >
        {showWords && words && words.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row-reverse',
              gap: spacing[2],
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {words.map((word, index) => (
              <motion.span
                key={index}
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: config.wordFont,
                  color: colors.primary[600],
                  padding: `${spacing[1]} ${spacing[2]}`,
                  backgroundColor: colors.primary[50],
                  borderRadius: borderRadius.lg,
                  cursor: onWordClick ? 'pointer' : 'default',
                }}
                whileHover={onWordClick ? { scale: 1.1, backgroundColor: colors.primary[100] } : {}}
                whileTap={onWordClick ? { scale: 0.95 } : {}}
                onClick={(e) => {
                  if (onWordClick) {
                    e.stopPropagation()
                    onWordClick(index)
                  }
                }}
              >
                {word}
              </motion.span>
            ))}
          </div>
        ) : null}

        <span style={sentenceStyle} className="hebrew-sentence">
          {sentence}
        </span>
      </motion.div>
    )
  }
)

SentenceCard.displayName = 'SentenceCard'

export default SentenceCard
