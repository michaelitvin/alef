import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { useSoundEffects } from '../../hooks/useAudio'

interface LevelCompleteScreenProps {
  /** The level that was completed */
  levelId: 'letters' | 'nikkud' | 'syllables' | 'words' | 'sentences'
  /** The next level that was unlocked (if any) */
  nextLevelId?: 'nikkud' | 'syllables' | 'words' | 'sentences'
  /** Callback when animation is complete and ready to navigate */
  onComplete?: () => void
}

const LEVEL_NAMES: Record<string, string> = {
  letters: 'האותיות',
  nikkud: 'הניקוד',
  syllables: 'הצֵרוּפִים',
  words: 'המילים',
  sentences: 'המשפטים',
}

const LEVEL_EMOJIS: Record<string, string> = {
  letters: '🔤',
  nikkud: '✨',
  syllables: '🔗',
  words: '📖',
  sentences: '📝',
}

/**
 * LevelCompleteScreen - Celebration screen when all nodes in a level are mastered
 */
export function LevelCompleteScreen({
  levelId,
  nextLevelId,
  onComplete,
}: LevelCompleteScreenProps) {
  const navigate = useNavigate()
  const { playCelebrate } = useSoundEffects()

  // Play celebration sound on mount
  useEffect(() => {
    playCelebrate()
  }, [playCelebrate])

  // Auto-navigate after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
      navigate('/')
    }, 5000)
    return () => clearTimeout(timer)
  }, [navigate, onComplete])

  const handleContinue = () => {
    onComplete?.()
    navigate('/')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: spacing[4],
      }}
    >
      {/* Confetti background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: -20,
              rotate: 0,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 100,
              rotate: Math.random() * 720 - 360,
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              position: 'absolute',
              width: '12px',
              height: '12px',
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              backgroundColor: [
                colors.primary[400],
                colors.secondary[400],
                colors.success[400],
                '#FFD700',
                '#FF69B4',
                '#00CED1',
              ][Math.floor(Math.random() * 6)],
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 15, delay: 0.2 }}
        style={{
          fontSize: '8rem',
          marginBottom: spacing[4],
        }}
      >
        🏆
      </motion.div>

      <motion.h1
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize['4xl'],
          fontWeight: typography.fontWeight.bold,
          color: '#FFD700',
          textAlign: 'center',
          margin: 0,
          marginBottom: spacing[2],
          textShadow: '0 2px 10px rgba(255, 215, 0, 0.5)',
        }}
      >
        כל הכבוד!
      </motion.h1>

      <motion.p
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize['2xl'],
          color: colors.surface,
          textAlign: 'center',
          margin: 0,
          marginBottom: spacing[6],
        }}
      >
        סיימת את כל {LEVEL_NAMES[levelId]}! {LEVEL_EMOJIS[levelId]}
      </motion.p>

      {nextLevelId && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: 'spring', damping: 12 }}
          style={{
            backgroundColor: colors.success[500],
            padding: `${spacing[4]} ${spacing[6]}`,
            borderRadius: borderRadius['2xl'],
            boxShadow: shadows.lg,
            marginBottom: spacing[6],
          }}
        >
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.xl,
              color: colors.surface,
              textAlign: 'center',
              margin: 0,
            }}
          >
            🎉 נפתח לך שלב חדש: {LEVEL_NAMES[nextLevelId]}! 🎉
          </p>
        </motion.div>
      )}

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{
          display: 'flex',
          gap: spacing[4],
        }}
      >
        <motion.button
          onClick={handleContinue}
          style={{
            padding: `${spacing[4]} ${spacing[8]}`,
            backgroundColor: colors.primary[500],
            color: colors.surface,
            border: 'none',
            borderRadius: borderRadius.xl,
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            cursor: 'pointer',
            boxShadow: shadows.lg,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          המשך למסע 🗺️
        </motion.button>
      </motion.div>

      {/* Stars animation */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={`star-${i}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            delay: Math.random() * 3,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
          style={{
            position: 'absolute',
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
            fontSize: '2rem',
          }}
        >
          ⭐
        </motion.div>
      ))}
    </motion.div>
  )
}

export default LevelCompleteScreen
