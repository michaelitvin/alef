// End of a run (spec 2026-11-07: an end screen that pulls him back): his coins with a ring that shows how close the next
// coin is, the crystals he won, the trophy of a boss beaten in this run, the next boss he has not beaten as a dark
// silhouette, the points of this run and his best, and a big glowing play button — nothing else (a home button next to
// play again took him out of the game by mistake). The voice says the run-end line (and the new-best line) — neither
// praise for a loss nor disappointment (rule).
import { useEffect, useRef, useState } from 'react'
import { duel2Telemetry } from '../telemetry'
import { say } from '../audio/duel2Audio'
import { lineAudioId } from '../data/lines'
import { CoinIcon, PlayIcon, TrophyIcon } from '../components/icons'
import { StarCount } from '../components/StarCount'
import { InfoTap } from '../components/InfoTap'
import { BossTrophy } from '../components/BossShelf'
import { BOSS_KINDS, bossOpen, type BossKind } from '../logic/boss'
import { COIN_EVERY, coinsOf, useDuel2Store } from '../store'

const RING_R = 58
const RING_C = 2 * Math.PI * RING_R

/** Stars toward the next coin: from where the ring stood before the run (or after the run's last coin) to now. */
export function coinRing(startStars: number, nowStars: number): { from: number; to: number } {
  const boundary = Math.floor(nowStars / COIN_EVERY) * COIN_EVERY
  return { from: Math.max(startStars, boundary) - boundary, to: nowStars - boundary }
}

function CoinRing({ coins, from, to }: { coins: number; from: number; to: number }) {
  const [frac, setFrac] = useState(from / COIN_EVERY)
  useEffect(() => {
    const id = window.setTimeout(() => setFrac(to / COIN_EVERY), 400)
    return () => window.clearTimeout(id)
  }, [to])
  return (
    <InfoTap line="info-coin-ring">
      <span data-coin-ring data-from={from} data-to={to} className="d2-coin-ring">
        <svg viewBox="0 0 140 140" aria-hidden>
          <circle cx="70" cy="70" r={RING_R} fill="none" stroke="#ffffff22" strokeWidth="12" />
          <circle cx="70" cy="70" r={RING_R} fill="none" stroke="#ffd34d" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - frac)} transform="rotate(-90 70 70)" className="d2-coin-ring-fill" />
        </svg>
        <span className="d2-coin-ring-coin"><CoinIcon /></span>
        <span data-num data-coins="" className="d2-coin-ring-num">{coins}</span>
      </span>
    </InfoTap>
  )
}

export function Summary({ over, onAgain }: { over: { score: number; crystals: number; best: boolean; bosses?: BossKind[]; startStars?: number }; onAgain: () => void }) {
  const best = useDuel2Store((s) => s.bestRun)
  const totalStars = useDuel2Store((s) => s.totalStars ?? 0)
  const beaten = useDuel2Store((s) => s.bossesBeaten ?? [])
  const stage = useDuel2Store((s) => s.stage.stage)
  // how long he looked at the end screen before playing again (the parent: he gives up after a loss)
  const shown = useRef(Date.now())
  useEffect(() => {
    const ids = [lineAudioId('run-end', 1 + Math.floor(Math.random() * 3))]
    if (over.best) ids.push(lineAudioId('new-best', 1 + Math.floor(Math.random() * 2)))
    void say(ids)
  }, [over])
  const ring = coinRing(over.startStars ?? totalStars, totalStars)
  const won = [...new Set(over.bosses ?? [])]
  // the next boss that waits for him: one his stage has opened first
  const waiting = BOSS_KINDS.filter((k) => !beaten.includes(k))
  const teaser = waiting.find((k) => bossOpen(k, stage)) ?? waiting[0]
  return (
    <div className="d2-root d2-summary" data-screen="summary">
      <div className="d2-summary-row">
        {over.best && <span data-best className="d2-trophy"><TrophyIcon /></span>}
        {over.crystals > 0 && <InfoTap line="info-crystals">{Array.from({ length: Math.min(over.crystals, 6) }, (_, i) => (
          <svg key={i} data-crystal-icon viewBox="0 0 40 60" className="d2-crystal-icon" aria-hidden>
            <polygon points="20,2 34,18 28,58 12,58 6,18" fill={i % 2 ? '#b98cf0' : '#e8eeff'} stroke="#fff" strokeWidth="2" />
          </svg>
        ))}</InfoTap>}
        {(won.length > 0 || teaser) && (
          <InfoTap line="info-bosses" className="d2-summary-bosses">
            {won.map((k) => <BossTrophy key={k} kind={k} beaten size={120} />)}
            {teaser && <BossTrophy kind={teaser} beaten={false} teaser size={96} />}
          </InfoTap>
        )}
      </div>
      <div className="d2-summary-row">
        <CoinRing coins={coinsOf(totalStars)} from={ring.from} to={ring.to} />
        <InfoTap line="info-stars"><StarCount n={over.score} size="big" attr="data-run-score" /></InfoTap>
        <InfoTap line="info-best"><span className="d2-best"><span className="d2-trophy-small"><TrophyIcon /></span><span data-num data-best-score>{Math.max(best, over.score)}</span></span></InfoTap>
      </div>
      <div className="d2-summary-row">
        <button aria-label="play again" className="d2-play d2-play-big" onClick={() => { duel2Telemetry.track('again', { ms: Date.now() - shown.current, score: over.score }); onAgain() }}><PlayIcon /></button>
      </div>
    </div>
  )
}
