// Entry to the Nikkud Wizard Duel (Home + Nikkud screens). Available from the start; no text — the wizard
// and crossed swords say "play the duel" to a child who can't read yet.
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { borderRadius, spacing } from '../../styles/theme'
import { WIZARD } from '../../assets/duel/sprites'
import { Icon } from './Icon'

export function DuelEntryCard({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  return (
    <motion.button
      aria-label="duel"
      onClick={() => navigate('/duel')}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[4],
        width: '100%',
        maxWidth: 520,
        margin: `0 auto ${spacing[4]}`,
        padding: compact ? spacing[2] : spacing[3],
        border: '2px solid rgba(255, 211, 77, 0.7)',
        borderRadius: borderRadius.xl,
        background: 'radial-gradient(ellipse at 70% 20%, rgba(160, 80, 255, 0.45), transparent 60%), linear-gradient(135deg, #3b1d6e, #1a1240)',
        boxShadow: '0 0 24px rgba(140, 90, 255, 0.45)',
        cursor: 'pointer',
      }}
    >
      <img src={WIZARD.cast} alt="" draggable={false} style={{ height: compact ? 64 : 96, width: 'auto', filter: 'drop-shadow(0 0 12px #b48cff)' }} />
      <Icon name="swords" size={compact ? 32 : 40} />
    </motion.button>
  )
}
