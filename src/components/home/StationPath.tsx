// The path under the duel card (spec: one duel, Part 4; the approved mock): the duel's minigames as stations on a dotted
// zigzag trail, right to left, scrolling sideways only. Open stations first; locked ones greyed out with a lock (they do
// nothing). Three small dots under each disc fill with his recent accuracy there (not stars). The wizard stands at the
// newest open station. Each open station opens one short session of its minigame. Captions are for the parent.
import wizBoy from '../../duel2/assets/img/s-wizard-cast.webp'
import wizGirl from '../../duel2/assets/img/s-wizard-cast-girl.webp'
import { useGender, wizardArt } from '../../shared/player'
import { StationPic } from './StationPic'
import { LockBadge } from './LevelIcons'
import { useStations, type StationState } from './stations'

const WIZ = { 's-wizard-cast': wizBoy, 's-wizard-cast-girl': wizGirl }
export const stationHref = (id: string) => `${import.meta.env.BASE_URL}duel2/?station=${id}`

function Trail({ n }: { n: number }) {
  const w = (n + 2) * 90
  const d = `M30 60 ${Array.from({ length: n + 2 }, (_, i) => `Q ${i * 90 + 75} ${i % 2 ? 100 : 30} ${i * 90 + 120} 60`).join(' ')}`
  return (
    <svg className="home-trail" width={w} aria-hidden>
      <path d={d} fill="none" stroke="#b08a3a" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round" />
    </svg>
  )
}

function Dots({ n }: { n: number }) {
  return <div className="home-dots" aria-hidden>{[0, 1, 2].map((i) => <i key={i} className={i < n ? 'on' : undefined} />)}</div>
}

function StationItem({ s, i, wizard }: { s: StationState; i: number; wizard?: string }) {
  const body = (
    <>
      {wizard && <img className="home-wizhere" data-wizard src={wizard} alt="" draggable={false} />}
      <div className="home-disc">
        <StationPic id={s.id} />
        {!s.open && <LockBadge />}
      </div>
      {s.open ? <Dots n={s.rating} /> : <div className="home-dots" />}
      <div className="home-cap">{s.learn}</div>
    </>
  )
  const cls = `home-st ${i % 2 ? 'down' : 'up'}${s.open ? '' : ' locked'}`
  const data = { 'data-station': s.id, 'data-open': String(s.open), 'data-rating': s.rating }
  return s.open
    ? <a className={cls} href={stationHref(s.id)} {...data}>{body}</a>
    : <div className={cls} aria-disabled {...data}>{body}</div>
}

export function StationPath() {
  const stations = useStations()
  const gender = useGender()
  const wizard = wizardArt(WIZ, 's-wizard-cast', gender)
  const newest = stations.filter((s) => s.open).length - 1
  return (
    <div className="home-path" data-path data-home-part="path">
      <Trail n={stations.length} />
      {stations.map((s, i) => <StationItem key={s.id} s={s} i={i} wizard={i === newest ? wizard : undefined} />)}
    </div>
  )
}
