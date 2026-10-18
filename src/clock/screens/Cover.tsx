// The shop door: one big cuckoo clock showing the real time, its cuckoo popping out to greet him, the play button hanging
// under it like a weight, two customers waiting. No text (rule). Home to alef, and a 2-second
// hold for the parent area. The playtest: "The initial screen is just pure ugly" (a cropped wall, a small tower, a circle).
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { HomeIcon, PlayIcon, SlidersIcon } from '../components/icons'
import { ClockFace, discExtent } from '../components/ClockFace'
import { CUSTOMERS } from '../logic/workday'
import { useClockStore } from '../store'
import { IMAGES } from '../assets/images'
import { CASE_DISCS } from '../assets/caseDiscs'
import { mirrorFor } from '../assets/facing'
import { playSfx } from '../audio/clockAudio'

const HOLD_MS = 2000
const RING_C = 2 * Math.PI * 25 + 3
/** where the cuckoo's little door is in the cuckoo case image (fractions of its box) */
const DOOR = { x: 0.5, y: 0.228 }

const nowPose = (d = new Date()) => ({ hour: (d.getHours() % 12) * 30 + d.getMinutes() / 2, minute: d.getMinutes() * 6 })

/** The face size that fits the door's clock: most of the height in portrait, beside the button row in landscape. */
function useFaceSize() {
  const calc = () => {
    const w = window.innerWidth, h = window.innerHeight
    const ext = discExtent(CASE_DISCS.cuckoo, true)
    return w < h ? Math.min((w * 0.86) / ext.w, (h * 0.6) / ext.h) : Math.min((w * 0.4) / ext.w, (h * 0.86) / ext.h)
  }
  const [size, setSize] = useState(calc)
  useEffect(() => {
    const on = () => setSize(calc())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return size
}

export function Cover({ onPlay, onParent, loading = false }: { onPlay: () => void; onParent: () => void; loading?: boolean }) {
  const timer = useRef<number | undefined>(undefined)
  const hintTimer = useRef<number | undefined>(undefined)
  const started = useRef(0)
  // idle | holding (ring fills over 2 s) | hint (a short tap: ring frozen part-way, icon wiggles)
  const [state, setState] = useState<'idle' | 'holding' | 'hint'>('idle')
  const [frac, setFrac] = useState(0)
  const press = () => {
    window.clearTimeout(timer.current); window.clearTimeout(hintTimer.current)
    started.current = Date.now()
    setState('holding')
    timer.current = window.setTimeout(() => { setState('idle'); onParent() }, HOLD_MS)
  }
  const release = () => {
    if (state !== 'holding') return
    window.clearTimeout(timer.current)
    setFrac(Math.min(1, (Date.now() - started.current) / HOLD_MS))
    setState('hint')
    hintTimer.current = window.setTimeout(() => setState('idle'), 700)
  }
  useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(hintTimer.current) }, [])
  // the real time, now: the first clock he sees each day is today's
  const [pose, setPose] = useState(nowPose)
  useEffect(() => {
    const id = window.setInterval(() => setPose(nowPose()), 10000)
    return () => window.clearInterval(id)
  }, [])
  const secondsFrom = useRef(new Date().getSeconds() * 6).current
  const size = useFaceSize()
  const reduce = useReducedMotion()
  // the cuckoo pops out to say hello once, and again when he taps the clock
  const [pops, setPops] = useState(0)
  useEffect(() => {
    const id = window.setTimeout(() => setPops(1), 700)
    return () => window.clearTimeout(id)
  }, [])
  const tapClock = () => { setPops((n) => n + 1); void playSfx('cuckoo') }
  const workdays = useClockStore((s) => s.workdays)
  // two customers wait at the door, one from each language, both looking at the play button
  const guests = [CUSTOMERS[workdays % CUSTOMERS.length].id, CUSTOMERS[(workdays + CUSTOMERS.length / 2) % CUSTOMERS.length].id]
  const guestPic = (id: string, toward: 'left' | 'right', side: string) => {
    const mood = IMAGES[`${id}-happy`] ? 'happy' : 'idle'
    const img = IMAGES[`${id}-${mood}`]
    return img ? <img className={`ck-cover-guest ${side}`} src={img} alt="" draggable={false} data-guest={id}
      style={mirrorFor(id, mood, toward) ? { transform: 'scaleX(-1)' } : undefined} /> : <span />
  }

  return (
    <div className="ck-root ck-cover" style={IMAGES.workshop ? { ['--ck-workshop' as string]: `url(${IMAGES.workshop})` } : undefined}>
      <a aria-label="alef" className="ck-home" href={import.meta.env.BASE_URL}><HomeIcon /></a>
      <div className="ck-cover-stage">
        <button type="button" aria-label="clock" className="ck-cover-clock" onClick={tapClock}>
          <ClockFace pose={pose} kind="cuckoo" size={size} secondsFrom={secondsFrom} />
          {IMAGES['cuckoo-speak'] && pops > 0 && (
            // the wrapper sits on the little door (centred); the bird rises out of it and goes back in
            <div className="ck-cover-door" style={{ left: `${DOOR.x * 100}%`, top: `${DOOR.y * 100}%`, width: size * 0.5 }}>
              <motion.img key={pops} src={IMAGES['cuckoo-speak']} alt="" draggable={false} className="ck-cover-cuckoo"
                initial={{ y: '30%', scale: 0.2, opacity: 0 }}
                animate={reduce ? { y: '0%', scale: 1, opacity: 1 } : { y: ['30%', '0%', '0%', '8%', '0%', '30%'], scale: [0.2, 1, 1, 1, 1, 0.2], opacity: [0, 1, 1, 1, 1, 0] }}
                transition={reduce ? { duration: 0.3 } : { duration: 2.4, times: [0, 0.18, 0.45, 0.55, 0.65, 1], ease: 'easeInOut' }} />
            </div>
          )}
        </button>
        <div className="ck-cover-row">
          {guestPic(guests[0], 'right', 'start')}
          {/* while the game still loads after a tap, a ring turns round the button (no text) */}
          <button aria-label="play" className={`ck-play${loading ? ' loading' : ''}`} onClick={onPlay} data-loading={loading || undefined}>
            <PlayIcon size={Math.round(Math.min(150, Math.max(104, size * 0.62)))} />
            {loading && <svg className="ck-play-ring" viewBox="0 0 170 170" aria-hidden><circle cx="85" cy="85" r="80" /></svg>}
          </button>
          {guestPic(guests[1], 'left', 'end')}
        </div>
      </div>
      <button type="button" aria-label="parent settings (hold)" title="Hold for 2 seconds: parent settings"
        className={`ck-parent-btn ck-parent-${state}`} onPointerDown={press} onPointerUp={release} onPointerLeave={release}
        onPointerCancel={release} onContextMenu={(e) => e.preventDefault()} onKeyDown={(e) => e.preventDefault()}>
        <svg className="ck-parent-ring" viewBox="0 0 56 56" width="56" height="56" aria-hidden>
          <circle cx="28" cy="28" r="25" className="ck-parent-ring-bg" />
          <circle data-testid="parent-ring" data-state={state} cx="28" cy="28" r="25" className="ck-parent-ring-fg"
            strokeDasharray={RING_C} style={state === 'hint' ? { strokeDashoffset: RING_C * (1 - frac) } : undefined}
            transform="rotate(-90 28 28)" />
        </svg>
        <SlidersIcon size={28} />
      </button>
    </div>
  )
}
