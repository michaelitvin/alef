// The flight bosses he keeps (spec 2026-11-07: end screen and cover): a beaten boss sits in a golden frame, one he has not
// beaten yet is a dark silhouette in a dashed ring, so he sees there are more to find. A tap says what they are.
import { IMAGES } from '../assets/images'
import { FACING } from '../assets/facing'
import { BOSS_KINDS, type BossKind } from '../logic/boss'
import { InfoTap } from './InfoTap'

export function BossTrophy(p: { kind: BossKind; beaten: boolean; teaser?: boolean; size?: number }) {
  const img = IMAGES[`boss-${p.kind}-fly`]
  // on the shelf they all face the same way (left, as they face the wizard in the flight)
  const mirror = FACING[`boss-${p.kind}`] === 'right'
  return (
    <span data-trophy={p.kind} {...(p.beaten ? { 'data-beaten': '' } : {})} {...(p.teaser ? { 'data-teaser': '' } : {})}
      className={`d2-trophy-slot ${p.beaten ? 'd2-trophy-beaten' : 'd2-trophy-dark'}`} style={{ width: p.size ?? 96, height: p.size ?? 96 }}>
      {img && <img src={img} alt="" draggable={false} style={mirror ? { transform: 'scaleX(-1)' } : undefined} />}
    </span>
  )
}

/** The cover's trophy shelf: the 4 bosses in a row. */
export function BossShelf({ beaten }: { beaten: BossKind[] }) {
  return (
    <InfoTap line="info-bosses">
      <div data-boss-shelf className="d2-boss-shelf">
        {BOSS_KINDS.map((k) => <BossTrophy key={k} kind={k} beaten={beaten.includes(k)} />)}
      </div>
    </InfoTap>
  )
}
