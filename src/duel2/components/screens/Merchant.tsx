// The merchant's visit (spec: one duel, Part 2), on the 1600×900 stage, from the game's own parts: the wizard on the left,
// the gnome merchant on the right facing him, the potion in his raised hand with its price tag, his open hand where the
// coins go, the child's coins in piles on the ground (one pile per value, drawn up to PILE_CAP), and one ✗ card for "no
// thanks". No text: only digits (the values, the price, the merchant's count).
import { useState } from 'react'
import { IMAGES, useWizardArt } from '../../assets/images'
import { FACING } from '../../assets/facing'
import type { MerchantView } from '../../controller'
import { hintCoins, piles } from '../../logic/merchant'
import { DragPick } from '../DragPick'
import { DemoHand, HandShape } from '../DemoHand'
import { PriceTag, ValueCoin, coinSize } from '../ValueCoin'
import { Stage, faceTransform } from './Stage'

// The coins are the screen's choices, so they get the bottom of the stage, across its whole width, at a size a finger can
// pick on a phone on its side (the parent: the coins were too small); the wizard and the merchant stand behind them.
export const WIZARD = { x: 40, y: 310, h: 380 }
export const GNOME = { right: 1570, bottom: 700, h: 480 }
export const POTION = { x: 1175, y: 374, w: 130 }
export const TAG = { x: POTION.x - 210, y: 316 }
/** his open hand: where the coins go (DROP_R: the drop zone around it, generous: a child's drop is not precise) */
export const HAND = { x: 1355, y: 508, r: 85 }
export const DROP_R = HAND.r * 2.4
/** the piles' row: from x to right, standing on bottom; gap between columns; each coin of a pile shows `step` of the one under it */
export const PILES = { x: 20, right: 1580, bottom: 885, gap: 36, step: 0.1 }
export const DECLINE = { x: 560, y: 220, size: 200 }
export const BUBBLE = { x: 1355, y: 409 }

/** a pile's coin size in stage units, by value: a bigger value is a bigger coin; the 1's drawn coin (COIN_FACE of it) is at least ~56 CSS px on a phone on its side */
export function pileCoinSize(value: number): number {
  return ({ 1: 216, 2: 220, 5: 226, 10: 232, 20: 238, 50: 244, 100: 250, 200: 256, 500: 262 } as Record<number, number>)[value] ?? 226
}

/** a dragged coin let go here goes into his hand */
export const inHand = (q: { x: number; y: number }) => Math.hypot(q.x - HAND.x, q.y - HAND.y) < DROP_R

/** his coins that are not in the merchant's hand */
export function remaining(coins: number[], given: number[]): number[] {
  const left = [...coins]
  for (const g of given) { const i = left.indexOf(g); if (i >= 0) left.splice(i, 1) }
  return left
}

/**
 * Where each pile stands: its value, coins, the centre x of its column, its coin size, its top coin's centre, and its tap
 * area (the whole column, out to half the gap on each side, so neighbouring areas never overlap). Many piles (the range up
 * to 1000) shrink together to fit the row; bigger values stay bigger.
 */
export function pileLayout(coins: number[]) {
  const ps = piles(coins)
  const want = ps.reduce((a, p) => a + pileCoinSize(p.value), 0)
  const k = Math.min(1, (PILES.right - PILES.x - PILES.gap * Math.max(0, ps.length - 1)) / Math.max(1, want))
  let x = PILES.x
  return ps.map((p) => {
    const s = pileCoinSize(p.value) * k
    const cx = x + s / 2
    x += s + PILES.gap
    const topY = PILES.bottom - s / 2 - (p.drawn - 1) * s * PILES.step
    const area = { x: cx - (s + PILES.gap) / 2, y: topY - s / 2 - PILES.gap / 2, w: s + PILES.gap, h: PILES.bottom - topY + s / 2 + PILES.gap / 2 }
    return { ...p, cx, size: s, topY, area }
  })
}

export function Merchant({ v, onCoin, onHand, onPotion, onDecline }: {
  v: MerchantView; onCoin: (value: number) => void; onHand: () => void; onPotion: () => void; onDecline: () => void
}) {
  const wiz = useWizardArt()
  // he can give coins (the opening line and the demo are over; not while the merchant counts or leaves)
  const pay = v.phase === 'pay' && !v.demo
  // a coin is being dragged: his hand glows as the place to drop it, brighter while the coin is over it (the parent)
  const [drag, setDrag] = useState<'drag' | 'over' | null>(null)
  const glow = v.glow ?? {}
  const left = remaining(v.coins, v.given)
  const gnomeW = GNOME.h * (405 / 512)
  const gnomeX = GNOME.right - gnomeW
  const counting = v.phase === 'count' && (v.counted ?? 0) > 0
  const running = v.given.slice(0, v.counted ?? 0).reduce((a, b) => a + b, 0)
  const hintLeft = new Map<number, number>()
  for (const h of glow.hint ?? []) hintLeft.set(h, (hintLeft.get(h) ?? 0) + 1)
  // the ✗ is hidden while the first-visit demo plays, until the demo points it out (spec)
  const showDecline = (!v.demo || v.demo.step === 'decline' || v.demo.step === 'undo') && v.phase !== 'leave' && v.phase !== 'sold'
  const handSpacing = Math.min(48, 300 / Math.max(1, v.given.length))
  // the demo: everything but the step's target dims, and the game's pointing hand shows it (rule: a hand he knows)
  const step = v.demo?.step
  const dim = (target: boolean) => (step && !target ? { 'data-dim': '1', opacity: 0.3 } : {})
  const [dragT, setDragT] = useState(0)
  // D2 drags the top coin of the hint's first pile into his hand (and back)
  const demoValue = step === 'give' ? hintCoins(left, v.price)[0] : undefined
  const demoPile = demoValue !== undefined ? pileLayout(left).find((p) => p.value === demoValue) : undefined
  const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)
  const dragAt = demoPile ? { x: demoPile.cx + (HAND.x - demoPile.cx) * ease(dragT), y: demoPile.topY + (HAND.y + 14 - demoPile.topY) * ease(dragT),
    size: demoPile.size + (coinSize(demoPile.value) - demoPile.size) * ease(dragT) } : null
  const handGlow = (pay ? drag : null) ?? (glow.hand ? 'tap' : null)
  return (
    <Stage bg="bg-ground" data-merchant={v.phase}>
      {wiz('s-wizard-idle') && <image {...dim(false)} data-wizard href={wiz('s-wizard-idle')} x={WIZARD.x} y={WIZARD.y} height={WIZARD.h} width={WIZARD.h * (334 / 420)} />}
      <g data-gnome className={`d2-gnome d2-gnome-${v.phase}`} {...dim(false)}>
        <g transform={faceTransform(FACING['merchant-sell'], 'left', gnomeX + gnomeW / 2)}>
          {IMAGES['merchant-sell']
            ? <image href={IMAGES['merchant-sell']} x={gnomeX} y={GNOME.bottom - GNOME.h} width={gnomeW} height={GNOME.h} />
            : <ellipse cx={gnomeX + gnomeW / 2} cy={GNOME.bottom - GNOME.h / 2} rx={gnomeW / 2.4} ry={GNOME.h / 2.2} fill="#3c7a3a" />}
        </g>
      </g>
      {!v.bought && (
        <g data-potion {...dim(step === 'potion')} className={`d2-press${glow.potion || (pay && v.given.length > 0) ? ' d2-pulse' : ''}`}
          onPointerDown={(e) => { e.preventDefault(); onPotion() }} style={{ cursor: 'pointer' }}>
          <circle cx={POTION.x} cy={POTION.y} r={POTION.w * 0.62} fill="transparent" />
          {IMAGES['s-potion']
            ? <image href={IMAGES['s-potion']} x={POTION.x - POTION.w / 2} y={POTION.y - POTION.w * (412 / 512) / 2} width={POTION.w} height={POTION.w * (412 / 512)} />
            : <circle cx={POTION.x} cy={POTION.y} r={50} fill="#ff5a7a" />}
        </g>
      )}
      {v.bought && v.phase === 'sold' && IMAGES['s-potion'] && (
        // the potion flies to the wizard
        <g className="d2-potion-fly"><image href={IMAGES['s-potion']} x={POTION.x - POTION.w / 2} y={POTION.y - POTION.w * (412 / 512) / 2} width={POTION.w} height={POTION.w * (412 / 512)} /></g>
      )}
      {!v.bought && <g data-tag-part {...dim(step === 'price')}><PriceTag price={v.price} x={TAG.x} y={TAG.y} flash={v.tag === 'flash'} lit={v.tag === 'lit'} glow={glow.tag} /></g>}
      <g data-merchant-hand data-drop-glow={(pay && drag) || undefined} {...dim(step === 'give' || step === 'undo')} className="d2-press" onPointerDown={(e) => { e.preventDefault(); onHand() }} style={{ cursor: 'pointer' }}>
        <circle cx={HAND.x} cy={HAND.y} r={handGlow === 'over' ? HAND.r * 1.25 : HAND.r} fill={handGlow ? (handGlow === 'over' ? '#fff6a077' : '#fff6a044') : 'transparent'}
          stroke={handGlow ? '#fff6a0' : 'none'} strokeWidth={handGlow === 'over' ? 9 : 6}
          className={handGlow === 'over' ? 'd2-glow d2-glow-strong' : handGlow ? 'd2-glow' : undefined} />
        {!v.bought && v.given.map((g, i) => (
          <ValueCoin key={i} value={g} x={HAND.x + (i - (v.given.length - 1) / 2) * handSpacing} y={HAND.y + 14}
            state={v.phase === 'count' && i < (v.counted ?? 0) ? 'lit' : undefined} />
        ))}
      </g>
      {counting && (
        <g data-count-bubble>
          <rect x={BUBBLE.x - 70} y={BUBBLE.y - 40} width={140} height={80} rx={26} fill="#fff8e7" stroke="#8a4a12" strokeWidth={5} />
          <text data-num data-count x={BUBBLE.x} y={BUBBLE.y + 17} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={800} fontSize={48} fill="#5a2c08">{running}</text>
        </g>
      )}
      <g data-piles className={glow.piles ? 'd2-pulse-once' : undefined} {...dim(step === 'give')}>
        {pileLayout(left).map((p) => {
          let hints = Math.min(p.drawn, hintLeft.get(p.value) ?? 0)
          // the demo lifts this pile's top coin (it moves with the hand)
          const lifted = demoPile?.value === p.value
          const coins = Array.from({ length: p.drawn }, (_, i) => i)
          const ys = coins.map((i) => PILES.bottom - p.size / 2 - i * p.size * PILES.step)
          // the hint's coins glow green from the top of the pile down; otherwise the top coin glows softly while he can pick it
          const state = coins.map(() => undefined as 'hint' | 'can' | undefined)
          for (let i = p.drawn - 1; i >= 0 && hints > 0; i--, hints--) state[i] = 'hint'
          if (pay && !state[p.drawn - 1]) state[p.drawn - 1] = 'can'
          return (
            <g key={p.value} data-pile={p.value} data-pile-count={p.count}>
              {coins.slice(0, -1).map((i) => <ValueCoin key={i} value={p.value} size={p.size} x={p.cx} y={ys[i]} state={state[i]} />)}
              <DragPick enabled={pay} attrs={{ 'data-pile-top': String(p.value) }} onPick={() => onCoin(p.value)}
                inZone={inHand} onDrag={(q) => setDrag(q === null ? null : inHand(q) ? 'over' : 'drag')}>
                {/* the whole column is the tap area of its top coin (rule: a large tap area) */}
                <rect data-pile-area x={p.area.x} y={p.area.y} width={p.area.w} height={p.area.h} fill="transparent" />
                {!lifted && <ValueCoin value={p.value} size={p.size} x={p.cx} y={p.topY} state={state[p.drawn - 1]} />}
              </DragPick>
            </g>
          )
        })}
      </g>
      {dragAt && demoPile && <ValueCoin value={demoPile.value} size={dragAt.size} x={dragAt.x} y={dragAt.y} />}
      {showDecline && (
        <foreignObject x={DECLINE.x - DECLINE.size / 2} y={DECLINE.y - DECLINE.size / 2} width={DECLINE.size} height={DECLINE.size} overflow="visible">
          <div data-decline className="d2-xcard" data-glow={glow.decline ? 'true' : undefined} role="button" aria-label="no thanks"
            onPointerDown={(e) => { e.preventDefault(); onDecline() }}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="#ff7a6a" strokeWidth="3.4" strokeLinecap="round" /></svg>
          </div>
        </foreignObject>
      )}
      {step === 'price' && <HandShape x={TAG.x + 100} y={TAG.y + 72} />}
      {step === 'give' && demoPile && (
        <DemoHand key={v.demo!.t} from={{ x: demoPile.cx, y: demoPile.topY }} to={{ x: HAND.x, y: HAND.y + 14 }} durationMs={1400} onMove={setDragT} onDone={() => {}} loop />
      )}
      {step === 'potion' && <g className="d2-tap"><HandShape x={POTION.x + 10} y={POTION.y + 30} /></g>}
      {step === 'decline' && <g className="d2-tap"><HandShape x={DECLINE.x + 20} y={DECLINE.y + 50} /></g>}
      {step === 'undo' && <g className="d2-tap"><HandShape x={HAND.x} y={HAND.y} /></g>}
    </Stage>
  )
}
