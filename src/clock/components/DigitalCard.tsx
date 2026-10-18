// A digital clock card: digits only (he reads digits), LCD style.
export function DigitalCard({ text, size = 1, glow = false }: { text: string; size?: number; glow?: boolean }) {
  return (
    <div data-digital className={`ck-digital ${glow ? 'glow' : ''}`} style={{ fontSize: `${2.6 * size}rem` }} dir="ltr">
      {text}
    </div>
  )
}
