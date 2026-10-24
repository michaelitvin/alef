// Entry to Book 2 (letters and syllables), a separate app at <base>/duel2/. No text: the game's own art — the wizard on
// his broom flying at syllable orbs — says "the flying wizard game", the way the duel card shows its wizard.
import { motion } from 'framer-motion'
import { borderRadius, spacing } from '../../styles/theme'
import wizbroom from '../../duel2/assets/img/s-wizbroom.webp'
import orb from '../../duel2/assets/img/s-orb.webp'

const ORBS = [
  { text: 'בָּ', size: 74, lift: -14 },
  { text: 'לִ', size: 58, lift: 18 },
]

export function Duel2EntryCard() {
  return (
    <motion.a
      aria-label="book 2"
      href={`${import.meta.env.BASE_URL}duel2/`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[3], direction: 'ltr',
        width: '100%', maxWidth: 520, margin: `0 auto ${spacing[4]}`, padding: spacing[3],
        border: '2px solid rgba(255, 211, 77, 0.7)', borderRadius: borderRadius.xl,
        background: 'radial-gradient(ellipse at 30% 25%, rgba(90, 200, 255, 0.28), transparent 60%), linear-gradient(135deg, #2a1d6e, #120a35)',
        boxShadow: '0 0 24px rgba(120, 140, 255, 0.45)', textDecoration: 'none',
      }}
    >
      <img data-art="wizbroom" src={wizbroom} alt="" draggable={false} style={{ height: 96, width: 'auto', filter: 'drop-shadow(0 0 12px #b48cff)' }} />
      {ORBS.map((o) => (
        <span key={o.text} data-orb style={{ position: 'relative', width: o.size, height: o.size, transform: `translateY(${o.lift}px)`, flex: 'none' }}>
          <img src={orb} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block' }} />
          <span data-glyph style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', direction: 'rtl',
            fontFamily: "'Sigalit', 'Noto Sans Hebrew', sans-serif", fontSize: o.size * 0.5, color: '#fff6d8', lineHeight: 1,
            textShadow: '0 0 3px #1b0f3c, 0 0 6px #1b0f3c',
          }}>{o.text.normalize('NFC')}</span>
        </span>
      ))}
    </motion.a>
  )
}
