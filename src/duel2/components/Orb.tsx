// A round orb (choices, signs, vowel orbs) and a plate (ladder rungs, the door's word plate) in stage coordinates.
// Tapping answers on finger-down; the hit area is larger than the drawing (moving targets are hard to tap: rule).
import type { ReactNode } from 'react'
import { IMAGES } from '../assets/images'
import { TEST_HOOKS } from '../testHooks'

export type PickState = 'idle' | 'right' | 'wrong' | 'near' | 'reveal' | 'off'
const RING: Record<PickState, string | undefined> = {
  idle: undefined, right: '#ffffff', wrong: '#ff4d6a', near: '#8fd8ff', reveal: '#ffd34d', off: undefined,
}

function Picker(p: { w: number; h: number; x: number; y: number; state: PickState; onPick?: () => void; testCorrect?: boolean; round: boolean; children?: ReactNode; img: string }) {
  const ring = RING[p.state]
  const can = p.state === 'idle' && !!p.onPick
  const hw = p.w * 0.65
  const hh = p.h * 0.65
  return (
    <g className={`d2-pick d2-pick-${p.state}`} opacity={p.state === 'off' ? 0.35 : 1}>
      {ring && (p.round
        ? <circle cx={p.x} cy={p.y} r={p.w * 0.54} fill="none" stroke={ring} strokeWidth={8} className="d2-ring" />
        : <rect x={p.x - p.w * 0.54} y={p.y - p.h * 0.6} width={p.w * 1.08} height={p.h * 1.2} rx={p.h * 0.25} fill="none" stroke={ring} strokeWidth={8} className="d2-ring" />)}
      {IMAGES[p.img]
        ? <image href={IMAGES[p.img]} x={p.x - p.w / 2} y={p.y - p.h / 2} width={p.w} height={p.h} preserveAspectRatio="xMidYMid meet" />
        : p.round
          ? <circle cx={p.x} cy={p.y} r={p.w / 2} fill="#2a1660" stroke="#ffd34d" strokeWidth={p.w * 0.06} />
          : <rect x={p.x - p.w / 2} y={p.y - p.h / 2} width={p.w} height={p.h} rx={p.h * 0.2} fill="#2a1660" stroke="#ffd34d" strokeWidth={p.h * 0.08} />}
      {p.children}
      <rect data-pick x={p.x - hw} y={p.y - hh} width={hw * 2} height={hh * 2} fill="transparent"
        {...(TEST_HOOKS && p.testCorrect ? { 'data-correct': '1' } : {})}
        style={{ cursor: can ? 'pointer' : 'default' }}
        onPointerDown={(e) => { e.preventDefault(); if (can) p.onPick!() }} />
    </g>
  )
}

export function Orb(p: { size: number; x: number; y: number; children?: ReactNode; state?: PickState; onPick?: () => void; testCorrect?: boolean }) {
  return <Picker w={p.size} h={p.size} x={p.x} y={p.y} state={p.state ?? 'idle'} onPick={p.onPick} testCorrect={p.testCorrect} round img="s-orb">{p.children}</Picker>
}

/** The plate is about twice as wide as it is tall. */
export function Plate(p: { w: number; x: number; y: number; children?: ReactNode; state?: PickState; onPick?: () => void; testCorrect?: boolean }) {
  return <Picker w={p.w} h={p.w * 0.49} x={p.x} y={p.y} state={p.state ?? 'idle'} onPick={p.onPick} testCorrect={p.testCorrect} round={false} img="s-plate">{p.children}</Picker>
}
