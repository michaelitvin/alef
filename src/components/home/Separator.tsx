// A thin gold line with a star (the approved mock): between the reading section and the clock, and before the shelf.
export function Separator() {
  return (
    <div className="home-sep" data-home-part="separator" aria-hidden>
      <span />
      <svg viewBox="0 0 20 20" width="14" height="14"><path d="M10 0 L12.4 7.6 L20 10 L12.4 12.4 L10 20 L7.6 12.4 L0 10 L7.6 7.6 Z" fill="#c9a24a" /></svg>
      <span />
    </div>
  )
}
