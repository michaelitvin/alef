import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows, fonts } from '../../styles/theme'
import type { FontType } from '../../types/progress'
import { Header } from '../../components/navigation/Navigation'
import { ParentGate } from '../../shared/parentGate/ParentGate'
import { GearIcon } from '../../components/home/HomeIcons'
import './settings.css'
import { useProgressStore } from '../../stores/progressStore'
import { useResponsive } from '../../hooks/useResponsive'

export function SettingsPage() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  // the parent gate on every visit (rule): nothing is stored, so Back, Forward or a reload shows it again
  const [verified, setVerified] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const devMode = useProgressStore((state) => state.settings.devMode)
  const setDevMode = useProgressStore((state) => state.setDevMode)
  const font = useProgressStore((state) => state.settings.font)
  const setFont = useProgressStore((state) => state.setFont)
  const resetProgress = useProgressStore((state) => state.resetProgress)

  // Font options with display names
  const fontOptions: { id: FontType; name: string; preview: string }[] = [
    { id: 'default', name: 'דפוס', preview: 'אָלֶף' },
    { id: 'cursive', name: 'כתב יד', preview: 'אָלֶף' },
  ]

  const handleBack = () => {
    navigate('/')
  }

  const handleResetProgress = () => {
    resetProgress()
    setShowResetConfirm(false)
  }

  // the gate first
  if (!verified) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: colors.background,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header
          title="הגדרות"
          showBack
          onBack={handleBack}
        />
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          {/* a wrong year goes back home, with no message */}
          <ParentGate label="settings (hold)" className="settings-gate" onOpen={() => setVerified(true)} onCancel={() => navigate('/', { replace: true })}
            ring={{ track: colors.neutral[200], fill: colors.primary[500], width: 4, trackWidth: 4 }}
            overlay={<GearIcon size="40px" />} />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: isMobile ? '100px' : spacing[8],
      }}
    >
      <Header
        title="הגדרות"
        showBack
        onBack={handleBack}
      />

      <main
        style={{
          flex: 1,
          padding: spacing[4],
          maxWidth: '500px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Developer Mode */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: borderRadius['2xl'],
            padding: spacing[6],
            marginBottom: spacing[4],
            boxShadow: shadows.md,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
              <span style={{ fontSize: '1.5rem' }}>🔧</span>
              <div>
                <h3
                  style={{
                    fontFamily: typography.fontFamily.hebrew,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                    margin: 0,
                  }}
                >
                  מצב מפתח
                </h3>
                <p
                  style={{
                    fontFamily: typography.fontFamily.hebrew,
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    margin: 0,
                  }}
                >
                  פתיחת כל השלבים
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <motion.button
              onClick={() => setDevMode(!devMode)}
              style={{
                width: '60px',
                height: '32px',
                borderRadius: borderRadius.full,
                border: 'none',
                backgroundColor: devMode ? colors.success[500] : colors.neutral[300],
                cursor: 'pointer',
                position: 'relative',
                padding: 0,
              }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ x: devMode ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: borderRadius.full,
                  backgroundColor: colors.surface,
                  boxShadow: shadows.md,
                  position: 'absolute',
                  top: '2px',
                  left: '2px',
                }}
              />
            </motion.button>
          </div>
        </motion.section>

        {/* Font Selection */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: borderRadius['2xl'],
            padding: spacing[6],
            marginBottom: spacing[4],
            boxShadow: shadows.md,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
            <span style={{ fontSize: '1.5rem' }}>א</span>
            <div>
              <h3
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  margin: 0,
                }}
              >
                גופן
              </h3>
              <p
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                  margin: 0,
                }}
              >
                בחר את סגנון הכתב
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: spacing[3],
            }}
          >
            {fontOptions.map((option) => (
              <motion.button
                key={option.id}
                onClick={() => setFont(option.id)}
                style={{
                  padding: spacing[4],
                  backgroundColor: font === option.id ? colors.primary[50] : colors.neutral[50],
                  border: `2px solid ${font === option.id ? colors.primary[500] : colors.neutral[200]}`,
                  borderRadius: borderRadius.xl,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span
                  style={{
                    fontFamily: fonts[option.id],
                    fontSize: typography.fontSize['3xl'],
                    display: 'block',
                    marginBottom: spacing[2],
                    color: colors.text.primary,
                  }}
                >
                  {option.preview}
                </span>
                <span
                  style={{
                    fontFamily: typography.fontFamily.hebrew,
                    fontSize: typography.fontSize.sm,
                    color: font === option.id ? colors.primary[600] : colors.text.secondary,
                    fontWeight: font === option.id ? typography.fontWeight.semibold : typography.fontWeight.normal,
                  }}
                >
                  {option.name}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Reset Progress */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: borderRadius['2xl'],
            padding: spacing[6],
            marginBottom: spacing[4],
            boxShadow: shadows.md,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
            <span style={{ fontSize: '1.5rem' }}>🗑️</span>
            <div>
              <h3
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  margin: 0,
                }}
              >
                איפוס התקדמות
              </h3>
              <p
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                  margin: 0,
                }}
              >
                מחיקת כל ההתקדמות והתחלה מחדש
              </p>
            </div>
          </div>

          {!showResetConfirm ? (
            <motion.button
              onClick={() => setShowResetConfirm(true)}
              style={{
                width: '100%',
                padding: spacing[4],
                backgroundColor: colors.error[50],
                color: colors.error[600],
                border: `2px solid ${colors.error[200]}`,
                borderRadius: borderRadius.xl,
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                cursor: 'pointer',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              איפוס הכל
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p
                style={{
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize.base,
                  color: colors.error[600],
                  textAlign: 'center',
                  marginBottom: spacing[4],
                }}
              >
                האם אתה בטוח? כל ההתקדמות תימחק!
              </p>
              <div style={{ display: 'flex', gap: spacing[3] }}>
                <motion.button
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    flex: 1,
                    padding: spacing[3],
                    backgroundColor: colors.neutral[100],
                    color: colors.text.primary,
                    border: 'none',
                    borderRadius: borderRadius.xl,
                    fontFamily: typography.fontFamily.hebrew,
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ביטול
                </motion.button>
                <motion.button
                  onClick={handleResetProgress}
                  style={{
                    flex: 1,
                    padding: spacing[3],
                    backgroundColor: colors.error[500],
                    color: colors.surface,
                    border: 'none',
                    borderRadius: borderRadius.xl,
                    fontFamily: typography.fontFamily.hebrew,
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  כן, אפס
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.section>
      </main>
    </div>
  )
}
