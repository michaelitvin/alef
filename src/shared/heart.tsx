// The life heart every game shares (Book 2's, which the parent knows): one shape in a 24-unit box, one pink, a soft glow.
// A heart that is lost is a ghost of it (a faint fill and a pale outline), for a game that keeps the place of a lost life.
export const HEART_PATH = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.5 1.1 4.6 2.6l1 1.3 1-1.3C14.1 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z'
export const HEART_FULL = '#ff5a7a'
export const HEART_GLOW = '#ff5a7a88'
export const HEART_EMPTY = { fill: 'rgba(255,255,255,.12)', stroke: 'rgba(255,255,255,.45)' } as const

export const HeartIcon = ({ full = true }: { full?: boolean }) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden data-icon="heart">
    <path d={HEART_PATH} fill={full ? HEART_FULL : HEART_EMPTY.fill} stroke={full ? 'none' : HEART_EMPTY.stroke} strokeWidth={full ? 0 : 1.2} />
  </svg>
)
