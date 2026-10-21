// End of a run: the points of this run, his best, the crystals he won, a trophy when it is a new best, and play again —
// nothing else (a home button next to play again took him out of the game by mistake). The voice says the run-end line
// (and the new-best line) — neither praise for a loss nor disappointment (rule).
import { useEffect } from 'react'
import { say } from '../audio/duel2Audio'
import { lineAudioId } from '../data/lines'
import { PlayIcon, TrophyIcon } from '../components/icons'
import { StarCount } from '../components/StarCount'
import { useDuel2Store } from '../store'

export function Summary({ over, onAgain }: { over: { score: number; crystals: number; best: boolean }; onAgain: () => void }) {
  const best = useDuel2Store((s) => s.bestRun)
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
        <StarCount n={over.score} size="big" attr="data-run-score" />
        <span className="d2-best"><span className="d2-trophy-small"><TrophyIcon /></span><span data-num data-best-score>{Math.max(best, over.score)}</span></span>
      </div>
      <div className="d2-summary-row">
        <button aria-label="play again" className="d2-play" onClick={onAgain}><PlayIcon /></button>
      </div>
    </div>
  )
}
