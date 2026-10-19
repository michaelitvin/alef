// Entry to Book 2 (letters and syllables), a separate app at <base>/duel2/. No text: a glowing orb with בָּ drawn as
// shapes, under a wizard hat, says "the wizard's syllables".
import { motion } from 'framer-motion'
import { borderRadius, spacing } from '../../styles/theme'

export function Duel2EntryCard() {
  return (
    <motion.a
      aria-label="book 2"
      href={`${import.meta.env.BASE_URL}duel2/`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', maxWidth: 520, margin: `0 auto ${spacing[4]}`, padding: spacing[3],
        border: '2px solid #ffd34d', borderRadius: borderRadius.xl,
        background: 'linear-gradient(135deg, #3c2a7a, #160a35)', boxShadow: '0 0 18px rgba(180, 140, 255, 0.55)',
      }}
    >
      <svg viewBox="-50 -60 100 110" width="96" height="104" aria-hidden>
        <path d="M-30 -22 L0 -58 L30 -22 Z" fill="#4a3a9a" stroke="#ffd34d" strokeWidth="3" />
        <ellipse cx="0" cy="-22" rx="38" ry="7" fill="#4a3a9a" stroke="#ffd34d" strokeWidth="3" />
        <circle cx="0" cy="16" r="32" fill="#2a1660" stroke="#ffd34d" strokeWidth="4" />
        {/* bet: roof, right wall, base with a foot to the left; dagesh; kamatz below */}
        <path d="M-13 2 H10 V26 M-16 26 H16" fill="none" stroke="#fff6d8" strokeWidth="5" strokeLinecap="round" />
        <circle cx="-1" cy="15" r="3" fill="#fff6d8" />
        <path d="M-7 36 H7 M0 36 V43" stroke="#fff6d8" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </motion.a>
  )
}
