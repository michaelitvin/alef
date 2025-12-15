import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { NikkudCard } from './NikkudCard'

export interface NikkudIntroProps {
  /** The nikkud mark to introduce */
  nikkud: string
  /** The name of the nikkud in Hebrew */
  nikkudName: string
  /** Description of how to pronounce */
  description: string
  /** The letter used in the example */
  exampleLetter: string
  /** Whether this is a full vowel (holam male or shuruk) */
  isFullVowel?: boolean
  /** Called when user wants to hear the nikkud name */
  onPlayName?: () => void
  /** Called when user wants to hear the sound */
  onPlaySound?: () => void
  /** Called when user is ready to continue */
  onContinue?: () => void
}

/**
 * NikkudIntro - Introduces a nikkud (vowel mark) to the learner
 * Shows the nikkud visually, its name, and example with a letter
 */
export function NikkudIntro({
  nikkud,
  nikkudName,
  description,
  exampleLetter,
  isFullVowel = false,
  onPlayName,
  onPlaySound,
  onContinue,
}: NikkudIntroProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[6],
        padding: spacing[4],
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      {/* Nikkud mark display - full vowels show inline, regular nikkud shown with alef */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {isFullVowel ? (
          // Full vowels (holam male, shuruk) are displayed inline without a base letter
          <motion.div
            style={{
              width: '180px',
              height: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surface,
              borderRadius: borderRadius['2xl'],
              boxShadow: shadows.glow,
              cursor: 'pointer',
            }}
            onClick={onPlaySound}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span
              style={{
                fontFamily: typography.fontFamily.hebrew,
                fontSize: '8rem',
                lineHeight: 1,
                color: colors.text.primary,
              }}
            >
              {nikkud}
            </span>
          </motion.div>
        ) : (
          <NikkudCard
            letter="א"
            nikkud={nikkud}
            size="xl"
            animate="pulse"
            showGlow
            onClick={onPlaySound}
          />
        )}
      </motion.div>

      {/* Nikkud name */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['4xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.secondary[600],
            marginBottom: spacing[2],
            cursor: onPlayName ? 'pointer' : 'default',
          }}
          onClick={onPlayName}
        >
          {nikkudName}
        </h2>
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.xl,
            color: colors.text.secondary,
          }}
        >
          {description}
        </p>
      </motion.div>

      {/* Example - for regular nikkud show with letter, for full vowels show word example */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          backgroundColor: colors.secondary[50],
          padding: spacing[4],
          borderRadius: borderRadius.xl,
          textAlign: 'center',
          width: '100%',
        }}
      >
        {isFullVowel ? (
          // Full vowels show word example instead of letter+nikkud combination
          <>
            <p
              style={{
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize.lg,
                color: colors.secondary[700],
                marginBottom: spacing[3],
              }}
            >
              דוגמה במילה:
            </p>
            <motion.div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                borderRadius: borderRadius.xl,
                padding: spacing[4],
                boxShadow: shadows.md,
                cursor: 'pointer',
              }}
              onClick={onPlaySound}
              whileHover={{ scale: 1.05 }}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: '4rem',
                  lineHeight: 1,
                  color: colors.text.primary,
                }}
              >
                {exampleLetter}
              </span>
            </motion.div>
          </>
        ) : (
          <>
            <p
              style={{
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize.lg,
                color: colors.secondary[700],
                marginBottom: spacing[3],
              }}
            >
              דוגמה עם האות {exampleLetter}:
            </p>
            <NikkudCard
              letter={exampleLetter}
              nikkud={nikkud}
              size="lg"
              onClick={onPlaySound}
            />
          </>
        )}
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{
          display: 'flex',
          gap: spacing[3],
          width: '100%',
        }}
      >
        <motion.button
          onClick={onPlaySound}
          style={{
            flex: 1,
            padding: `${spacing[3]} ${spacing[4]}`,
            borderRadius: borderRadius.xl,
            border: `2px solid ${colors.secondary[300]}`,
            backgroundColor: colors.surface,
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.lg,
            color: colors.secondary[600],
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          🔊 שמע
        </motion.button>

        <motion.button
          onClick={onContinue}
          style={{
            flex: 1,
            padding: `${spacing[3]} ${spacing[4]}`,
            borderRadius: borderRadius.xl,
            border: 'none',
            backgroundColor: colors.secondary[500],
            boxShadow: shadows.md,
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.surface,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
          }}
          whileHover={{ scale: 1.02, backgroundColor: colors.secondary[600] }}
          whileTap={{ scale: 0.98 }}
        >
          המשך ←
        </motion.button>
      </motion.div>
    </div>
  )
}

export default NikkudIntro
