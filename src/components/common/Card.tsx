import { motion } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'
import { colors, borderRadius, shadows, spacing } from '../../styles/theme'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive'

export interface CardProps {
  children: ReactNode
  variant?: CardVariant
  padding?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 'none'
  hoverable?: boolean
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  'aria-label'?: string
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    backgroundColor: colors.surface,
    boxShadow: shadows.sm,
    border: 'none',
  },
  elevated: {
    backgroundColor: colors.surface,
    boxShadow: shadows.lg,
    border: 'none',
  },
  outlined: {
    backgroundColor: colors.surface,
    boxShadow: 'none',
    border: `2px solid ${colors.neutral[200]}`,
  },
  interactive: {
    backgroundColor: colors.surface,
    boxShadow: shadows.md,
    border: `2px solid transparent`,
  },
}

/**
 * Card component for content containers
 * Used for displaying letters, words, activity options, etc.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 4,
      hoverable = false,
      selected = false,
      disabled = false,
      onClick,
      className,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const paddingValue = padding === 'none' ? '0' : spacing[padding as keyof typeof spacing] || '1rem'

    const baseStyle: React.CSSProperties = {
      borderRadius: borderRadius.xl,
      padding: paddingValue,
      cursor: disabled ? 'not-allowed' : hoverable ? 'pointer' : 'default',
      opacity: disabled ? 0.6 : 1,
      ...variantStyles[variant],
      ...(selected && {
        borderColor: colors.primary[500],
        boxShadow: shadows.glow,
      }),
    }

    return (
      <motion.div
        ref={ref}
        style={baseStyle}
        onClick={disabled ? undefined : onClick}
        className={className}
        aria-label={ariaLabel}
        role={hoverable ? 'button' : undefined}
        tabIndex={hoverable && !disabled ? 0 : undefined}
        whileHover={hoverable && !disabled ? { scale: 1.02 } : undefined}
        whileTap={hoverable && !disabled ? { scale: 0.98 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

/**
 * LetterCard - specialized card for displaying Hebrew letters
 */
export interface LetterCardProps extends Omit<CardProps, 'children'> {
  letter: string
  nikkud?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showGlow?: boolean
}

const letterSizes = {
  sm: '3rem',
  md: '4rem',
  lg: '6rem',
  xl: '8rem',
}

export const LetterCard = forwardRef<HTMLDivElement, LetterCardProps>(
  (
    {
      letter,
      nikkud,
      size = 'lg',
      showGlow = false,
      onClick,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const displayText = nikkud ? `${letter}${nikkud}` : letter

    const style: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      aspectRatio: '1',
      minWidth: letterSizes[size],
      minHeight: letterSizes[size],
      boxShadow: showGlow ? shadows.glow : shadows.md,
    }

    return (
      <Card
        ref={ref}
        variant="interactive"
        hoverable
        onClick={onClick}
        className={className}
        aria-label={ariaLabel || `אות ${letter}`}
        {...props}
      >
        <div style={style}>
          <span
            className="hebrew-letter"
            style={{
              fontSize: letterSizes[size],
              lineHeight: 1.2,
              color: colors.text.primary,
            }}
          >
            {displayText}
          </span>
        </div>
      </Card>
    )
  }
)

LetterCard.displayName = 'LetterCard'

export default Card
