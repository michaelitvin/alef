import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { colors, typography, zIndex } from '../../styles/theme'

export type FeedbackType = 'success' | 'error' | 'celebration'

export interface FeedbackOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean
  /** Type of feedback to show */
  type: FeedbackType
  /** Optional message to display */
  message?: string
  /** Auto-hide after this many milliseconds (0 = don't auto-hide) */
  autoHideMs?: number
  /** Callback when overlay should be hidden */
  onHide?: () => void
  /** Custom content instead of default icon */
  children?: ReactNode
}

const feedbackConfig: Record<
  FeedbackType,
  {
    icon: string
    color: string
    bgColor: string
    defaultMessage: string
  }
> = {
  success: {
    icon: '✓',
    color: colors.success[500],
    bgColor: 'rgba(76, 175, 80, 0.15)',
    defaultMessage: 'כל הכבוד!',
  },
  error: {
    icon: '✗',
    color: colors.error[400],
    bgColor: 'rgba(244, 67, 54, 0.1)',
    defaultMessage: 'ננסה שוב!',
  },
  celebration: {
    icon: '🌟',
    color: colors.star,
    bgColor: 'rgba(255, 193, 7, 0.15)',
    defaultMessage: 'מדהים!',
  },
}

/**
 * FeedbackOverlay - Shows positive/encouraging feedback for correct/incorrect answers
 */
export function FeedbackOverlay({
  visible,
  type,
  message,
  autoHideMs = 1500,
  onHide,
  children,
}: FeedbackOverlayProps) {
  const config = feedbackConfig[type]
  const displayMessage = message ?? config.defaultMessage

  useEffect(() => {
    if (visible && autoHideMs > 0 && onHide) {
      const timer = setTimeout(onHide, autoHideMs)
      return () => clearTimeout(timer)
    }
  }, [visible, autoHideMs, onHide])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: config.bgColor,
            zIndex: zIndex.overlay,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 15,
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            {children ?? (
              <>
                <motion.div
                  animate={
                    type === 'success' || type === 'celebration'
                      ? {
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0],
                        }
                      : {
                          x: [0, -10, 10, -10, 10, 0],
                        }
                  }
                  transition={{ duration: 0.5 }}
                  style={{
                    fontSize: '5rem',
                    color: config.color,
                    textShadow: `0 0 20px ${config.color}`,
                  }}
                >
                  {config.icon}
                </motion.div>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    fontFamily: typography.fontFamily.hebrew,
                    fontSize: typography.fontSize['3xl'],
                    fontWeight: typography.fontWeight.bold,
                    color: config.color,
                    textAlign: 'center',
                  }}
                >
                  {displayMessage}
                </motion.p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook for managing feedback overlay state
 */
export function useFeedback() {
  const [state, setState] = useState<{
    visible: boolean
    type: FeedbackType
    message?: string
  }>({
    visible: false,
    type: 'success',
  })

  const show = (type: FeedbackType, message?: string) => {
    setState({ visible: true, type, message })
  }

  const hide = () => {
    setState((prev) => ({ ...prev, visible: false }))
  }

  const showSuccess = (message?: string) => show('success', message)
  const showError = (message?: string) => show('error', message)
  const showCelebration = (message?: string) => show('celebration', message)

  return {
    ...state,
    show,
    hide,
    showSuccess,
    showError,
    showCelebration,
    overlayProps: {
      visible: state.visible,
      type: state.type,
      message: state.message,
      onHide: hide,
    },
  }
}

// Need to import useState for the hook
import { useState } from 'react'

export default FeedbackOverlay
