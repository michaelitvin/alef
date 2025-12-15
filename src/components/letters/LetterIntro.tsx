import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { LetterCard } from './LetterCard'
import { Button } from '../common/Button'
import { useAudio } from '../../hooks/useAudio'
import { getLetterNameAudio } from '../../utils/audio'
import type { Letter, LetterVariant } from '../../types/entities'

export interface LetterIntroProps {
  /** The letter to introduce */
  letter: Letter
  /** Variants for this letter (if any) */
  variants?: LetterVariant[]
  /** Called when the introduction is complete */
  onComplete: () => void
  /** Called when user wants to replay audio */
  onReplay?: () => void
}

type IntroPhase = 'letter' | 'name' | 'complete'

/**
 * LetterIntro - Introduces a Hebrew letter with name and sound
 * Shows the letter large, plays the name, then the sound
 * For letters with variants (bet/vet, kaf/chaf, pe/fe, shin/sin), shows both sounds
 */
export function LetterIntro({ letter, variants, onComplete }: LetterIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>('letter')
  const { play, isPlaying } = useAudio()

  // Auto-advance through phases
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phase === 'letter') {
        setPhase('name')
        // Play letter name audio (TTS or pre-recorded)
        play(getLetterNameAudio(letter.id)).catch(console.error)
      } else if (phase === 'name' && !isPlaying) {
        setPhase('complete')
      }
    }, phase === 'letter' ? 1000 : 500)

    return () => clearTimeout(timer)
  }, [phase, isPlaying, play, letter.id])

  const handleReplayName = () => {
    play(getLetterNameAudio(letter.id)).catch(console.error)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[6],
        padding: spacing[4],
        minHeight: '60vh',
      }}
    >
      {/* Letter display with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key="letter"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <LetterCard
            letter={letter.character}
            size="xl"
            animate={phase === 'letter' ? 'pulse' : 'idle'}
            showGlow={phase !== 'letter'}
          />
        </motion.div>
      </AnimatePresence>

      {/* Letter name */}
      <AnimatePresence>
        {(phase === 'name' || phase === 'complete') && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center',
            }}
          >
            <motion.button
              onClick={handleReplayName}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: spacing[2],
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <p
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize['3xl'],
                  color: colors.primary[600],
                  margin: 0,
                }}
              >
                {letter.name}
              </p>
              <p
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize.lg,
                  color: colors.text.secondary,
                  margin: 0,
                }}
              >
                🔊 לחץ לשמוע שוב
              </p>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fun fact */}
      <AnimatePresence>
        {phase === 'complete' && letter.funFact && (
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.xl,
              color: colors.text.secondary,
              textAlign: 'center',
              maxWidth: '300px',
            }}
          >
            💡 {letter.funFact}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Letter variants section - shows both sounds for bet/vet, kaf/chaf, pe/fe, shin/sin */}
      <AnimatePresence>
        {phase === 'complete' && variants && variants.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{
              backgroundColor: colors.primary[50],
              padding: spacing[4],
              borderRadius: borderRadius.xl,
              width: '100%',
              maxWidth: '350px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize.lg,
                color: colors.primary[700],
                marginBottom: spacing[3],
              }}
            >
              {letter.hasSinVariant ? 'לאות הזו יש שני צלילים:' : 'לאות הזו שני צלילים - עם דגש ובלי:'}
            </p>
            <div
              style={{
                display: 'flex',
                gap: spacing[4],
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              {variants.map((variant) => (
                <motion.div
                  key={variant.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: colors.surface,
                    padding: spacing[3],
                    borderRadius: borderRadius.lg,
                    boxShadow: shadows.sm,
                    minWidth: '100px',
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    play(variant.audioSound).catch(console.error)
                  }}
                >
                  <span
                    style={{
                      fontFamily: typography.fontFamily.hebrew,
                      fontSize: typography.fontSize['3xl'],
                      lineHeight: 1,
                      marginBottom: spacing[2],
                    }}
                  >
                    {variant.character}
                  </span>
                  <span
                    style={{
                      fontFamily: typography.fontFamily.hebrew,
                      fontSize: typography.fontSize.base,
                      color: colors.text.secondary,
                    }}
                  >
                    צליל: {variant.sound}
                  </span>
                  <span
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.primary[500],
                      marginTop: spacing[1],
                    }}
                  >
                    🔊 לחץ לשמוע
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue button */}
      <AnimatePresence>
        {phase === 'complete' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Button
              variant="primary"
              size="lg"
              onClick={onComplete}
            >
              המשך ←
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LetterIntro
