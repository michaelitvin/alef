// Entry to the Clockmaker's Workshop, a separate app at <base>/clock/. No text: a clock face says "clocks".
import { motion } from 'framer-motion'
import { borderRadius, spacing } from '../../styles/theme'

export function ClockEntryCard() {
  return (
    <motion.a
      aria-label="clock"
      href={`${import.meta.env.BASE_URL}clock/`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', maxWidth: 520, margin: `0 auto ${spacing[4]}`, padding: spacing[3],
        border: '2px solid #e0b26a', borderRadius: borderRadius.xl,
        background: 'linear-gradient(135deg, #8a5a2b, #5a3417)', boxShadow: '0 0 18px rgba(224, 178, 106, 0.5)',
      }}
    >
      <svg viewBox="-50 -50 100 100" width="88" height="88" aria-hidden>
        <circle r="46" fill="#fff8e7" stroke="#c99a4b" strokeWidth="6" />
        <line x1="0" y1="0" x2="0" y2="-24" stroke="#c0392b" strokeWidth="7" strokeLinecap="round" transform="rotate(90)" />
        <line x1="0" y1="0" x2="0" y2="-36" stroke="#1f5fa8" strokeWidth="4" strokeLinecap="round" />
        <circle r="4" fill="#333" />
      </svg>
    </motion.a>
  )
}
