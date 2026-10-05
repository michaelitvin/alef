// PROTOTYPE tooling — floating bar that cycles ?variant= on a prototype route.
import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function PrototypeSwitcher({ variants, labels }: { variants: string[]; labels?: Record<string, string> }) {
  const [params, setParams] = useSearchParams()
  const current = params.get('variant') ?? variants[0]
  const idx = Math.max(0, variants.indexOf(current))

  const go = useCallback(
    (step: number) => {
      const next = variants[(idx + step + variants.length) % variants.length]
      const p = new URLSearchParams(params)
      p.set('variant', next)
      setParams(p, { replace: true })
    },
    [idx, params, setParams, variants],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const btn: React.CSSProperties = { background: 'none', border: 0, color: '#fff', fontSize: 18, padding: '0 10px', cursor: 'pointer' }
  return (
    <div
      dir="ltr"
      style={{
        position: 'fixed', bottom: 6, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
        display: 'flex', alignItems: 'center', background: '#111', color: '#fff', borderRadius: 999,
        padding: '4px 6px', fontSize: 13, fontFamily: 'system-ui, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,.5)', opacity: 0.85,
      }}
    >
      <button style={btn} onClick={() => go(-1)} aria-label="previous variant">‹</button>
      <span>
        {current}
        {labels?.[current] ? ` — ${labels[current]}` : ''}
      </span>
      <button style={btn} onClick={() => go(1)} aria-label="next variant">›</button>
    </div>
  )
}
