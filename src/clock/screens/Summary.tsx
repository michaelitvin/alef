// End of the workday: gears today and the clocks he fixed today hung up in a row; then the next workday
// (spec: Workday; the parent 2026-10-16: the fixed clocks without numbers).
import { motion } from 'framer-motion'
import { GearPileIcon, PlayIcon } from '../components/icons'
import { ClockFace, clockExtent } from '../components/ClockFace'
import type { ClockKind } from '../logic/workday'
import { poseOf } from '../logic/time'

export function Summary({ gears, fixedKinds, onAgain }: { gears: number; fixedKinds: ClockKind[]; onAgain: () => void }) {
  return (
    <div className="ck-summary">
      <motion.div className="ck-summary-row" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <GearPileIcon size={72} /><span className="ck-count big">{gears}</span>
      </motion.div>
      <div className="ck-summary-clocks" data-fixed={fixedKinds.length}>
        {fixedKinds.map((k, i) => (
          <motion.div key={i} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.12 }}>
            <ClockFace pose={poseOf({ h: 1 + ((i * 5) % 12), m: (i * 35) % 60 })} kind={k} size={Math.min(44, 76 / clockExtent(k).h)} numbers="none" />
          </motion.div>
        ))}
      </div>
      <button aria-label="play" className="ck-play" onClick={onAgain}><PlayIcon size={110} /></button>
    </div>
  )
}
