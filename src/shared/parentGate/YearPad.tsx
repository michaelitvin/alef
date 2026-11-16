// The number pad of the parent gate: four slots, the digits 0-9 and a delete key, over a dark backdrop. It shows no text
// beyond the digits. On the fourth digit it gives the year; a tap on the backdrop cancels.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import './parentGate.css'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

export function YearPad({ onYear, onCancel }: { onYear: (y: number) => void; onCancel: () => void }) {
  const [typed, setTyped] = useState('')
  const add = (d: string) => {
    const next = typed + d
    if (next.length < 4) { setTyped(next); return }
    setTyped('')
    onYear(Number(next))
  }
  const pad = (
    // data-parent-gate: a press here is not a tap on the game (the clock's door music ignores it)
    <div className="pg-backdrop" data-parent-gate data-pad-backdrop onPointerDown={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onCancel() }}>
      <div className="pg-pad" data-year-pad dir="ltr">
        <div className="pg-slots">
          {[0, 1, 2, 3].map((i) => <span key={i} className="pg-slot" data-year-slot data-num>{typed[i] ?? ''}</span>)}
        </div>
        <div className="pg-keys">
          {DIGITS.map((d) => (
            <button key={d} type="button" className="pg-key" data-digit={d} data-num onClick={() => add(d)}>{d}</button>
          ))}
          <button type="button" aria-label="delete" className="pg-key pg-del" data-pad-delete onClick={() => setTyped(typed.slice(0, -1))}>
            <svg viewBox="0 0 40 28" width="36" height="26" aria-hidden>
              <path d="M12 2h24a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H12L2 14z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M19 9l10 10M29 9L19 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
  return typeof document === 'undefined' ? pad : createPortal(pad, document.body)
}
