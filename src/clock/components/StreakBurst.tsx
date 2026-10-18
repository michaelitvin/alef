// 10 in a row (spec: Feedback, Streak): a brief burst of golden rays over the bench, with the fanfare and voice.
// Long rays only, no dots or specks (rule: no shape that looks like a nikkud mark).
import { motion } from 'framer-motion'

export function StreakBurst() {
  return (
    <motion.svg data-burst viewBox="-100 -100 200 200" className="ck-burst" aria-hidden
      initial={{ scale: 0.3, opacity: 0, rotate: 0 }} animate={{ scale: [0.3, 1.2, 1.4], opacity: [0, 1, 0], rotate: 25 }}
      transition={{ duration: 1.6, ease: 'easeOut' }}>
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d="M-5 -34 L0 -96 L5 -34 Z" fill={i % 2 ? '#ffd54a' : '#f5a623'} transform={`rotate(${i * 22.5})`} />
      ))}
    </motion.svg>
  )
}
