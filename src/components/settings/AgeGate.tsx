import { useState } from 'react'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'

interface AgeGateProps {
  onVerified: () => void
}

const SETTINGS_ACCESS_KEY = 'alef-settings-verified'

export function isSettingsVerified(): boolean {
  return sessionStorage.getItem(SETTINGS_ACCESS_KEY) === 'true'
}

export function AgeGate({ onVerified }: AgeGateProps) {
  const [year, setYear] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const enteredYear = parseInt(year, 10)
    const currentYear = new Date().getFullYear()
    const maxBirthYear = currentYear - 11 // Must be > 10 years old

    if (isNaN(enteredYear) || year.length !== 4) {
      setError('הזן שנה בת 4 ספרות')
      return
    }

    if (enteredYear > currentYear) {
      setError('שנה לא תקינה')
      return
    }

    if (enteredYear > maxBirthYear) {
      setError('הגדרות מיועדות להורים')
      return
    }

    // Verified - store in session and call callback
    sessionStorage.setItem(SETTINGS_ACCESS_KEY, 'true')
    onVerified()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: spacing[4],
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          backgroundColor: colors.surface,
          borderRadius: borderRadius['2xl'],
          padding: spacing[8],
          boxShadow: shadows.lg,
          maxWidth: '320px',
          width: '100%',
        }}
      >
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: '3rem', marginBottom: spacing[4] }}
        >
          🔒
        </motion.div>

        <motion.h2
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}
        >
          הגדרות
        </motion.h2>

        <motion.p
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            marginBottom: spacing[6],
          }}
        >
          מה שנת הלידה שלך?
        </motion.p>

        <motion.input
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="לדוגמה: 1985"
          value={year}
          onChange={(e) => {
            setYear(e.target.value.slice(0, 4))
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            padding: spacing[4],
            fontSize: typography.fontSize['2xl'],
            fontFamily: typography.fontFamily.hebrew,
            textAlign: 'center',
            border: `2px solid ${error ? colors.error[300] : colors.neutral[300]}`,
            borderRadius: borderRadius.xl,
            outline: 'none',
            marginBottom: spacing[4],
          }}
        />

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.base,
              color: colors.error[500],
              marginBottom: spacing[4],
            }}
          >
            {error}
          </motion.p>
        )}

        <motion.button
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleSubmit}
          style={{
            width: '100%',
            padding: spacing[4],
            backgroundColor: colors.primary[500],
            color: colors.surface,
            border: 'none',
            borderRadius: borderRadius.xl,
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            cursor: 'pointer',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          כניסה
        </motion.button>
      </motion.div>
    </div>
  )
}

export default AgeGate
