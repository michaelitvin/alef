// The duel's night sky and its announcement banner (shared by the duel's page and Book 2's tower screen).
import { useMemo } from 'react'
import type { BannerVisual } from '../../hooks/useDuelGame'
import { Icon } from './Icon'
import { MonsterImg } from './Explosion'

export function Starfield() {
  const stars = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({ i, x: Math.random() * 100, y: Math.random() * 62, s: Math.random() * 2.2 + 0.8, d: Math.random() * 3 })),
    [],
  )
  return (
    <div className="nd-sky">
      {stars.map((s) => (
        <span key={s.i} className="nd-star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
      ))}
    </div>
  )
}

export function Banner({ v }: { v: BannerVisual }) {
  if ('sprite' in v) return <span className="nd-banner-monster"><MonsterImg id={v.sprite} /></span>
  return (
    <span>
      {v.icons.map((n, i) => (
        <Icon key={i} name={n} size={v.icons.length > 1 && i !== 1 ? 60 : 110} />
      ))}
    </span>
  )
}
