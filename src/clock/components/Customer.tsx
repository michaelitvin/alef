// A customer at the door. Uses the generated picture when it exists, else a simple SVG animal head.
// All animals face left and are never mirrored (src/clock/assets/facing.ts), so he walks in from the right.
import { motion } from 'framer-motion'
import { IMAGES } from '../assets/images'

const COLORS: Record<string, string> = {
  hedgehog: '#8d6e63', cat: '#ffb74d', bear: '#795548', turtle: '#66bb6a', owl: '#a1887f', fox: '#ff7043', rabbit: '#e0e0e0', penguin: '#455a64',
}
export function Customer({ id, mood }: { id: string; mood: 'idle' | 'happy' }) {
  const img = IMAGES[`${id}-${mood}`] ?? IMAGES[`${id}-idle`]
  return (
    // he faces left, so he walks in from the right
    <motion.div className="ck-customer" key={id} initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1, y: mood === 'happy' ? [0, -14, 0] : 0 }} transition={{ duration: 0.6 }}>
      {img ? (
        <img src={img} alt="" draggable={false} />
      ) : (
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="55" r="38" fill={COLORS[id] ?? '#aaa'} />
          <circle cx="36" cy="48" r="6" fill="#222" />
          <circle cx="64" cy="48" r="6" fill="#222" />
          <path d={mood === 'happy' ? 'M34 66 Q50 82 66 66' : 'M38 70 Q50 74 62 70'} stroke="#222" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </motion.div>
  )
}
