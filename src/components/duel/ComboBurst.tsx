// A streak (every 5 hits in a row) is an event: stars burst across the screen around a big flame with the count.
// No words — he can't read yet; the count is the same "×N" the HUD shows next to its flame.
import { motion } from 'framer-motion'
import { Icon } from './Icon'

const STARS = 16

export function ComboBurst({ combo }: { combo: number }) {
  return (
    <div className="nd-combo-burst" aria-hidden>
      {Array.from({ length: STARS }, (_, i) => {
        const a = (i / STARS) * Math.PI * 2
        const r = 38 + (i % 3) * 9 // vw: rings at slightly different distances
        return (
          <motion.span
            key={i}
            className="nd-burst-star"
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
            animate={{ x: `${Math.cos(a) * r}vw`, y: `${Math.sin(a) * r * 0.6}vh`, scale: [0.2, 1.4, 0.8], opacity: [1, 1, 0], rotate: 220 }}
            transition={{ duration: 1.6, ease: 'easeOut', delay: (i % 4) * 0.05 }}
          >
            <Icon name="sparkle" size={30} />
          </motion.span>
        )
      })}
      <motion.div
        className="nd-burst-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.6, 1.2, 1.3], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2, times: [0, 0.25, 0.75, 1] }}
      >
        <Icon name="flame" size={72} /> ×{combo}
      </motion.div>
    </div>
  )
}
