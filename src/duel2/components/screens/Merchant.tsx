// The merchant's visit (spec: one duel, Part 2), on the 1600×900 stage, from the game's own parts: the wizard on the left,
// the gnome merchant on the right facing him, the potion in his raised hand with its price tag, his open hand where the
// coins go, the child's coins in piles on the ground (one pile per value, drawn up to PILE_CAP), and one ✗ card for "no
// thanks". No text: only digits (the values, the price, the merchant's count).
import { IMAGES, useWizardArt } from '../../assets/images'
import { FACING } from '../../assets/facing'
import type { MerchantView } from '../../controller'
import { piles } from '../../logic/merchant'
import { DragPick } from '../DragPick'
import { PriceTag, ValueCoin, coinSize } from '../ValueCoin'
import { Stage, faceTransform } from './Stage'

export const WIZARD = { x: 80, y: 330, h: 450 }
export const GNOME = { right: 1540, bottom: 800, h: 560 }
export const POTION = { x: 1080, y: 420, w: 150 }
export const TAG = { x: POTION.x - 210, y: 362 }
/** his open hand: the drop zone */
export const HAND = { x: 1290, y: 576, r: 90 }
export const PILES = { x: 90, bottom: 870, gap: 28 }
export const DECLINE = { x: 400, y: 200, size: 210 }
export const BUBBLE = { x: 1290, y: 460 }

/** his coins that are not in the merchant's hand */
export function remaining(coins: number[], given: number[]): number[] {
  const left = [...coins]
  for (const g of given) { const i = left.indexOf(g); if (i >= 0) left.splice(i, 1) }
  return left
}

/** where each pile stands: its value, coins, and the centre x of its column */
export function pileLayout(coins: number[]) {
  let x = PILES.x
  return piles(coins).map((p) => {
    const s = coinSize(p.value)
    const cx = x + s / 2
    x += s + PILES.gap
    return { ...p, cx, size: s, topY: PILES.bottom - s / 2 - (p.drawn - 1) * s * 0.24 }
  })
}

export function Merchant({ v, onCoin, onHand, onPotion, onDecline }: {
  v: MerchantView; onCoin: (value: number) => void; onHand: () => void; onPotion: () => void; onDecline: () => void
}) {
  const wiz = useWizardArt()
  const pay = v.phase === 'pay'
  const glow = v.glow ?? {}
  const left = remaining(v.coins, v.given)
  const gnomeW = GNOME.h * (405 / 512)
  const gnomeX = GNOME.right - gnomeW
  const counting = v.phase === 'count' && (v.counted ?? 0) > 0
  const running = v.given.slice(0, v.counted ?? 0).reduce((a, b) => a + b, 0)
  const hintLeft = new Map<number, number>()
  for (const h of glow.hint ?? []) hintLeft.set(h, (hintLeft.get(h) ?? 0) + 1)
  // the ✗ is hidden while the first-visit demo plays, until the demo points it out (spec)
  const showDecline = !v.demo || v.demo.step === 'decline' || v.demo.step === 'undo'
  const handSpacing = Math.min(48, 300 / Math.max(1, v.given.length))
  return (
    <Stage bg="bg-ground" data-merchant={v.phase}>
      {wiz('s-wizard-idle') && <image data-wizard href={wiz('s-wizard-idle')} x={WIZARD.x} y={WIZARD.y} height={WIZARD.h} width={WIZARD.h * (334 / 420)} />}
      <g data-gnome className={`d2-gnome d2-gnome-${v.phase}`}>
        <g transform={faceTransform(FACING['merchant-sell'], 'left', gnomeX + gnomeW / 2)}>
          {IMAGES['merchant-sell']
            ? <image href={IMAGES['merchant-sell']} x={gnomeX} y={GNOME.bottom - GNOME.h} width={gnomeW} height={GNOME.h} />
            : <ellipse cx={gnomeX + gnomeW / 2} cy={GNOME.bottom - GNOME.h / 2} rx={gnomeW / 2.4} ry={GNOME.h / 2.2} fill="#3c7a3a" />}
        </g>
      </g>
      {v.phase !== 'sold' && (
        <g data-potion className={`d2-press${glow.potion || (pay && v.given.length > 0) ? ' d2-pulse' : ''}`}
          onPointerDown={(e) => { e.preventDefault(); onPotion() }} style={{ cursor: 'pointer' }}>
          <circle cx={POTION.x} cy={POTION.y} r={POTION.w * 0.62} fill="transparent" />
          {IMAGES['s-potion']
            ? <image href={IMAGES['s-potion']} x={POTION.x - POTION.w / 2} y={POTION.y - POTION.w * (412 / 512) / 2} width={POTION.w} height={POTION.w * (412 / 512)} />
            : <circle cx={POTION.x} cy={POTION.y} r={50} fill="#ff5a7a" />}
        </g>
      )}
      {v.phase !== 'sold' && <PriceTag price={v.price} x={TAG.x} y={TAG.y} flash={v.tag === 'flash'} lit={v.tag === 'lit'} glow={glow.tag} />}
      <g data-merchant-hand className="d2-press" onPointerDown={(e) => { e.preventDefault(); onHand() }} style={{ cursor: 'pointer' }}>
        <circle cx={HAND.x} cy={HAND.y} r={HAND.r} fill={glow.hand ? '#fff6a044' : 'transparent'}
          stroke={glow.hand ? '#fff6a0' : 'none'} strokeWidth={6} className={glow.hand ? 'd2-glow' : undefined} />
        {v.given.map((g, i) => (
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
      <g data-piles className={glow.piles ? 'd2-pulse-once' : undefined}>
        {pileLayout(left).map((p) => {
          let hints = Math.min(p.drawn, hintLeft.get(p.value) ?? 0)
          const coins = Array.from({ length: p.drawn }, (_, i) => i)
          const ys = coins.map((i) => PILES.bottom - p.size / 2 - i * p.size * 0.24)
          // the hint's coins glow from the top of the pile down
          const state = coins.map(() => undefined as 'hint' | undefined)
          for (let i = p.drawn - 1; i >= 0 && hints > 0; i--, hints--) state[i] = 'hint'
          return (
            <g key={p.value} data-pile={p.value} data-pile-count={p.count}>
              {coins.slice(0, -1).map((i) => <ValueCoin key={i} value={p.value} x={p.cx} y={ys[i]} state={state[i]} />)}
              <DragPick enabled={pay} attrs={{ 'data-pile-top': String(p.value) }} onPick={() => onCoin(p.value)}
                inZone={(q) => Math.hypot(q.x - HAND.x, q.y - HAND.y) < HAND.r * 1.6}>
                {/* the whole column is the tap area of its top coin (rule: a large tap area) */}
                <rect x={p.cx - p.size / 2 - 10} y={p.topY - p.size / 2 - 10} width={p.size + 20} height={PILES.bottom - p.topY + p.size / 2 + 20} fill="transparent" />
                <ValueCoin value={p.value} x={p.cx} y={p.topY} state={state[p.drawn - 1]} />
              </DragPick>
            </g>
          )
        })}
      </g>
      {showDecline && (
        <foreignObject x={DECLINE.x - DECLINE.size / 2} y={DECLINE.y - DECLINE.size / 2} width={DECLINE.size} height={DECLINE.size} overflow="visible">
          <div data-decline className="d2-xcard" data-glow={glow.decline ? 'true' : undefined} role="button" aria-label="no thanks"
            onPointerDown={(e) => { e.preventDefault(); onDecline() }}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="#ff7a6a" strokeWidth="3.4" strokeLinecap="round" /></svg>
          </div>
        </foreignObject>
      )}
    </Stage>
  )
}
