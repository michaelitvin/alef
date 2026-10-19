// 4 · Look-alike ghosts: three ghosts float in from the right, each holding a sign with a letter (or a syllable). He taps
// the one he heard; the wizard zaps it and the others fade.
import { IMAGES } from '../../assets/images'
import { FACING } from '../../assets/facing'
import type { Choice } from '../../logic/rounds'
import { Glyph } from '../Glyph'
import { Orb, type PickState } from '../Orb'
import { Stage, faceTransform, type Phase } from './Stage'

export const GHOST_W = 290
export const GHOST_H = GHOST_W * (600 / 574)
export const GHOST_SIGN = 160
export const GHOST_GLYPH_PX = 100
export const GHOST_SLOTS = [{ x: 620, top: 250 }, { x: 980, top: 205 }, { x: 1340, top: 255 }]

export function Ghosts(p: { signs: Choice[]; onPick: (id: string) => void; phase: Phase; zapped?: string; reveal?: { right: string; wrong?: string }; correctId?: string }) {
  const can = p.phase === 'answer'
  const wizH = 330
  return (
    <Stage bg="bg-ground">
      {IMAGES['s-wizard-cast'] && <image data-wizard href={IMAGES['s-wizard-cast']} x={90} y={875 - wizH} width={wizH * (449 / 420)} height={wizH} />}
      {p.signs.map((c, i) => {
        const s = GHOST_SLOTS[i]
        const cy = s.top + GHOST_H * 0.74
        let state: PickState = p.phase === 'feedback' || p.phase === 'celebrate' ? 'off' : 'idle'
        if (p.reveal?.right === c.id) state = 'reveal'
        else if (p.reveal?.wrong === c.id) state = 'wrong'
        const gone = p.zapped !== undefined && p.zapped !== c.id
        return (
          <g key={c.id} data-ghost={c.id} data-facing="left" className={`d2-ghost${p.zapped === c.id ? ' d2-zapped' : ''}`}
            style={{ opacity: gone ? 0.15 : 1, transition: 'opacity 400ms', animationDelay: `${-i * 1.1}s` }}>
            <g transform={faceTransform(FACING['s-ghost'], 'left', s.x)}>
              {IMAGES['s-ghost']
                ? <image href={IMAGES['s-ghost']} x={s.x - GHOST_W / 2} y={s.top} width={GHOST_W} height={GHOST_H} />
                : <ellipse cx={s.x} cy={s.top + GHOST_H / 2} rx={GHOST_W / 2.4} ry={GHOST_H / 2} fill="#f4f0ff" />}
            </g>
            <Orb size={GHOST_SIGN} x={s.x} y={cy} state={state} onPick={can ? () => p.onPick(c.id) : undefined} testCorrect={c.id === p.correctId}>
              <Glyph text={c.text} px={GHOST_GLYPH_PX} x={s.x} y={cy} />
            </Orb>
          </g>
        )
      })}
    </Stage>
  )
}
