// End of a run: the crystals he won, a trophy when it is his best run, play again and home. The voice says the run-end line
// (and the new-best line) — neither praise for a loss nor disappointment (rule).
import { useEffect } from 'react'
import { say } from '../audio/duel2Audio'
import { lineAudioId } from '../data/lines'
import { HomeIcon, PlayIcon, TrophyIcon } from '../components/icons'

export function Summary({ over, onAgain }: { over: { score: number; crystals: number; best: boolean }; onAgain: () => void }) {
  useEffect(() => {
    const ids = [lineAudioId('run-end', 1 + Math.floor(Math.random() * 3))]
    if (over.best) ids.push(lineAudioId('new-best', 1 + Math.floor(Math.random() * 2)))
    void say(ids)
  }, [over])
  return (
    <div className="d2-root d2-summary" data-screen="summary">
      <div className="d2-summary-row">
        {over.best && <span data-best className="d2-trophy"><TrophyIcon /></span>}
        {Array.from({ length: Math.min(over.crystals, 6) }, (_, i) => (
          <svg key={i} data-crystal-icon viewBox="0 0 40 60" className="d2-crystal-icon" aria-hidden>
            <polygon points="20,2 34,18 28,58 12,58 6,18" fill={i % 2 ? '#b98cf0' : '#e8eeff'} stroke="#fff" strokeWidth="2" />
          </svg>
        ))}
      </div>
      <div className="d2-summary-row">
        <a aria-label="alef" className="d2-btn" href={import.meta.env.BASE_URL}><HomeIcon /></a>
        <button aria-label="play again" className="d2-play" onClick={onAgain}><PlayIcon /></button>
      </div>
    </div>
  )
}
