import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import { colors, typography, borderRadius, shadows, spacing } from '../../styles/theme'

export type WordCardSize = 'sm' | 'md' | 'lg'

export interface WordCardProps {
  /** The Hebrew word to display */
  word: string
  /** Optional syllable breakdown */
  syllables?: string[]
  /** Size of the card */
  size?: WordCardSize
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
  /** Click handler for individual syllables */
  onSyllableClick?: (index: number) => void
  /** Whether to show syllable breakdown */
  showSyllables?: boolean
  /** Animation state */
  animate?: 'idle' | 'bounce' | 'wiggle' | 'pulse'
}

const sizeConfig: Record<WordCardSize, { padding: string; font: string; syllableFont: string }> = {
  sm: { padding: spacing[3], font: typography.fontSize['2xl'], syllableFont: typography.fontSize.lg },
  md: { padding: spacing[4], font: typography.fontSize['3xl'], syllableFont: typography.fontSize.xl },
  lg: { padding: spacing[5], font: typography.fontSize['4xl'], syllableFont: typography.fontSize['2xl'] },
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
    rotate: [0, -3, 3, -3, 3, 0],
    transition: {
      duration: 0.5,
    },
  },
  pulse: {
    scale: [1, 1.03, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
}

/**
 * WordCard - Displays a Hebrew word with optional syllable breakdown
 * Used for word introduction, reading practice, and quizzes
 */
export const WordCard = forwardRef<HTMLDivElement, WordCardProps>(
  (
    {
      word,
      syllables,
      size = 'md',
      selected = false,
      disabled = false,
      showGlow = false,
      isCorrect = false,
      isIncorrect = false,
      onClick,
      onSyllableClick,
      showSyllables = false,
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
      display: 'inline-flex',
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
      gap: spacing[2],
    }

    const wordStyle: React.CSSProperties = {
      fontFamily: typography.fontFamily.hebrew,
      fontSize: config.font,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: 1.4,
      color: colors.text.primary,
    }

    return (
      <motion.div
        ref={ref}
        style={cardStyle}
        onClick={disabled ? undefined : onClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`מילה: ${word}`}
        aria-pressed={selected}
        aria-disabled={disabled}
        animate={animate !== 'idle' ? animationVariants[animate] : undefined}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onClick && !disabled) {
            e.preventDefault()
            onClick()
          }
        }}
      >
        {showSyllables && syllables && syllables.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: spacing[2],
              justifyContent: 'center',
            }}
          >
            {syllables.map((syllable, index) => (
              <motion.span
                key={index}
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: config.syllableFont,
                  color: colors.primary[600],
                  padding: `${spacing[1]} ${spacing[2]}`,
                  backgroundColor: colors.primary[50],
                  borderRadius: borderRadius.lg,
                  cursor: onSyllableClick ? 'pointer' : 'default',
                }}
                whileHover={onSyllableClick ? { scale: 1.1, backgroundColor: colors.primary[100] } : {}}
                whileTap={onSyllableClick ? { scale: 0.95 } : {}}
                onClick={(e) => {
                  if (onSyllableClick) {
                    e.stopPropagation()
                    onSyllableClick(index)
                  }
                }}
              >
                {syllable}
              </motion.span>
            ))}
          </div>
        ) : null}

        <span style={wordStyle} className="hebrew-word">
          {word}
        </span>
      </motion.div>
    )
  }
)

WordCard.displayName = 'WordCard'

export default WordCard
