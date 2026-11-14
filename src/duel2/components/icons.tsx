// Book 2 icons: inline SVG only (no emoji: rule). One meaning each.
export const HeartIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
    <path fill="#ff5a7a" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.5 1.1 4.6 2.6l1 1.3 1-1.3C14.1 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" />
  </svg>
)
/** "say it again": a speaker with sound waves */
export const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden data-icon="speaker">
    <path fill="#fff6d8" d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#fff6d8" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
)
/** the hint and help button: a question mark in the bar's cream, with a gold spark at its dot (the parent: "a hint button
 * would be more intuitive if it looked like a question mark") */
export const HintIcon = () => (
  <svg viewBox="0 0 24 24" width="62%" height="62%" aria-hidden data-icon="question">
    <path d="M8 8.6a4 4 0 1 1 5.6 3.7c-1 .5-1.6 1.3-1.6 2.4v.8" stroke="#fff6d8" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="20" r="2" fill="#ffd34d" />
  </svg>
)
/** next: the play triangle, as in the clock game (Michael: a left arrow was not understood as "go on") */
export const NextIcon = () => (
  <svg viewBox="0 0 24 24" width="55%" height="55%" aria-hidden data-icon="play"><path fill="#2a0f00" d="M8 5v14l11-7z" /></svg>
)
export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="55%" height="55%" aria-hidden><path fill="#2a0f00" d="M8 5v14l11-7z" /></svg>
)
export const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden>
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="#fff6d8" />
  </svg>
)
export const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
    <path fill="#ffd34d" d="M7 3h10v4a5 5 0 0 1-10 0zM4 4h3v2a3 3 0 0 1-3-2zm16 0h-3v2a3 3 0 0 0 3-2zM10 13h4v4h3v3H7v-3h3z" />
  </svg>
)
export const StarIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
    <path fill="#ffd34d" stroke="#fff3c4" strokeWidth="1" d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" />
  </svg>
)
/** the coin's parts (24-unit box), shared by CoinIcon and the merchant's value coins and price tag */
export const COIN_CRESCENT = 'M14.2 6.3a5.4 5.4 0 1 0 0 10.2a4.2 4.2 0 1 1 0-10.2z'
export const CoinBody = () => (
  <>
    <ellipse cx="12" cy="13.6" rx="10.2" ry="9.4" fill="#8a4a12" />
    <circle cx="12" cy="11.4" r="10" fill="#e8902a" stroke="#ffd9a0" strokeWidth="1" />
    <circle cx="12" cy="11.4" r="7.3" fill="none" stroke="#a85a14" strokeWidth="1.3" />
  </>
)
export const CoinShine = () => <path d="M5.2 8.2a7.6 7.6 0 0 1 3.6-3.6" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.2" strokeLinecap="round" />
/** a thick copper-gold coin with a crescent moon: never a star on it (the parent: coins and stars looked too similar) */
export const CoinIcon = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
    <CoinBody />
    <path fill="#fff0d2" d={COIN_CRESCENT} />
    <CoinShine />
  </svg>
)
