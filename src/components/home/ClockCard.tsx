// The clock card (spec: one duel, Part 4; the approved mock), in the same layout as the duel card and built from the
// clock game's own art: the workshop behind, the cuckoo clock with a real face (10:10), the cuckoo on its roof, the happy
// bear; three small clock faces (3:00, 3:30, 3:15) and a brass play button pointing left. Then what is learned.
import workshop from '../../clock/assets/img/workshop.webp'
import cuckooCase from '../../clock/assets/img/case-cuckoo.webp'
import cuckoo from '../../clock/assets/img/cuckoo-idle.webp'
import bear from '../../clock/assets/img/bear-happy.webp'
import { PlayButton } from './PlayButton'

export const CLOCK_HREF = () => `${import.meta.env.BASE_URL}clock/`
export const CLOCK_LEARN = 'לקרוא שעון מחוגים: שעות שלמות, חצאים ורבעים, ואחר כך כל חמש דקות. בעברית ובאנגלית.'

/** a clock face: the red short hand, the blue long hand, the numbers 12, 3, 6, 9 (the clock game's colours) */
export function Face({ h, m, size, numbers = true, rim = true }: { h: number; m: number; size?: number; numbers?: boolean; rim?: boolean }) {
  const ha = ((h % 12) + m / 60) * 30
  const ma = m * 6
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} data-face={`${h}:${String(m).padStart(2, '0')}`} aria-hidden>
      <circle r="46" fill="#fff8e7" stroke={rim ? '#c99a4b' : 'none'} strokeWidth="5" />
      {numbers && [12, 3, 6, 9].map((n) => {
        const a = (n * 30 * Math.PI) / 180
        return <text key={n} x={Math.sin(a) * 33} y={-Math.cos(a) * 33 + 5} fontSize="14" fontWeight="700" textAnchor="middle" fill="#5a3417" fontFamily="system-ui">{n}</text>
      })}
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1="0" y1="-42" x2="0" y2="-38" stroke="#8a5a2b" strokeWidth="2.5" transform={`rotate(${i * 30})`} />)}
      <line x1="0" y1="0" x2="0" y2="-22" stroke="#c0392b" strokeWidth="7" strokeLinecap="round" transform={`rotate(${ha})`} />
      <line x1="0" y1="0" x2="0" y2="-34" stroke="#1f5fa8" strokeWidth="4.5" strokeLinecap="round" transform={`rotate(${ma})`} />
      <circle r="4.5" fill="#333" />
    </svg>
  )
}

/** the small faces: hour, minute, scale, lift (px) */
const FACES: [number, number, number, number][] = [[3, 0, 1, -14], [3, 30, 0.85, 12], [3, 15, 0.75, -4]]

export function ClockCard() {
  return (
    <div data-home-part="clock">
      <a className="home-clk" href={CLOCK_HREF()} aria-label="clock" data-card="clock"
        style={{ backgroundImage: `linear-gradient(90deg, #3a200ccc, #5a3417aa 55%, #3a200cdd), url(${workshop})` }}>
        <div className="home-cart" aria-hidden>
          <img className="home-bear" src={bear} alt="" draggable={false} />
          <div className="home-cuck">
            <img src={cuckooCase} alt="" draggable={false} />
            <div className="home-cface"><Face h={10} m={10} numbers={false} rim={false} /></div>
            <img className="home-bird" src={cuckoo} alt="" draggable={false} />
          </div>
        </div>
        <div className="home-faces" aria-hidden>
          {FACES.map(([h, m, z, y]) => (
            <div key={`${h}${m}`} className="home-mf" style={{ transform: `translateY(calc(${y}px * var(--k)))` }}>
              <div style={{ width: `calc(${Math.round(z * 56)}px * var(--k))` }}><Face h={h} m={m} /></div>
            </div>
          ))}
        </div>
        <div className="home-pcol"><PlayButton theme="clock" /></div>
      </a>
      <p className="home-learn" data-learn="clock"><b>מה לומדים:</b> {CLOCK_LEARN}</p>
    </div>
  )
}
