import { motion } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'
import { colors, typography, borderRadius, shadows, transitions } from '../../styles/theme'

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  iconPosition?: 'start' | 'end'
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  'aria-label'?: string
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: colors.primary[500],
    color: colors.text.inverse,
    border: 'none',
  },
  secondary: {
    backgroundColor: colors.secondary[500],
    color: colors.text.inverse,
    border: 'none',
  },
  success: {
    backgroundColor: colors.success[500],
    color: colors.text.inverse,
    border: 'none',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.primary[600],
    border: 'none',
  },
  outline: {
    backgroundColor: 'transparent',
    color: colors.primary[600],
    border: `2px solid ${colors.primary[500]}`,
  },
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '0.5rem 1rem',
    fontSize: typography.fontSize.sm,
    minHeight: '36px',
    minWidth: '36px',
  },
  md: {
    padding: '0.75rem 1.5rem',
    fontSize: typography.fontSize.base,
    minHeight: '44px',
    minWidth: '44px',
  },
  lg: {
    padding: '1rem 2rem',
    fontSize: typography.fontSize.lg,
    minHeight: '52px',
    minWidth: '52px',
  },
  xl: {
    padding: '1.25rem 2.5rem',
    fontSize: typography.fontSize.xl,
    minHeight: '60px',
    minWidth: '60px',
  },
}

/**
 * Button component with child-friendly styling and animations
 * Large touch targets (minimum 44x44px), Hebrew-optimized text
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled = false,
      icon,
      iconPosition = 'start',
      onClick,
      type = 'button',
      className,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      fontFamily: typography.fontFamily.hebrew,
      fontWeight: typography.fontWeight.semibold,
      borderRadius: borderRadius.xl,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.6 : 1,
      transition: transitions.normal,
      boxShadow: variant !== 'ghost' ? shadows.md : 'none',
      width: fullWidth ? '100%' : 'auto',
      flexDirection: iconPosition === 'end' ? 'row-reverse' : 'row',
      ...variantStyles[variant],
      ...sizeStyles[size],
    }

    return (
      <motion.button
        ref={ref}
        style={baseStyle}
        disabled={isDisabled}
        onClick={onClick}
        type={type}
        className={className}
        aria-label={ariaLabel}
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {loading ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'inline-block' }}
          >
            ⏳
          </motion.span>
        ) : (
          icon
        )}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button
