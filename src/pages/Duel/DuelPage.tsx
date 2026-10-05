// Nikkud Wizard Duel — #/duel. Spec: docs/superpowers/specs/2026-10-05-nikkud-wizard-duel-design.md
import { useEffect, useMemo } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDuelGame, type BannerVisual } from '../../hooks/useDuelGame'
import { Battlefield, useLandscape } from '../../components/duel/Battlefield'
import { SpellPad } from '../../components/duel/SpellPad'
import { DuelHud } from '../../components/duel/DuelHud'
import { StartCover } from '../../components/duel/StartCover'
import { PauseCover } from '../../components/duel/PauseCover'
import { RunSummary } from '../../components/duel/RunSummary'
import { RuneGlowDefs } from '../../components/duel/RuneGlyph'
import { Icon, type IconName } from '../../components/duel/Icon'
import { MonsterImg } from '../../components/duel/Explosion'
import { WIZARD, preloadDuelImages } from '../../assets/duel/sprites'
import { preloadDuelAudio } from '../../utils/duel/duelAudio'
import { markById } from '../../utils/duel/marks'
import { MEGA_MAX, MONSTERS_PER_WAVE } from '../../utils/duel/rules'
import { duelMusicOn, useProgressStore } from '../../stores/progressStore'
import '../../components/duel/duel.css'

export const TEST_HOOKS = import.meta.env.MODE === 'verify' || import.meta.env.MODE === 'test'

const PROMPT_ICON: Record<string, IconName> = { A: 'eye', B: 'ear', C: 'ear', D: 'shield' }

function Starfield() {
  const stars = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({ i, x: Math.random() * 100, y: Math.random() * 62, s: Math.random() * 2.2 + 0.8, d: Math.random() * 3 })),
    [],
  )
  return (
    <div className="nd-sky">
      {stars.map((s) => (
        <span key={s.i} className="nd-star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
      ))}
    </div>
  )
}

function Banner({ v }: { v: BannerVisual }) {
  if ('wizard' in v) return <img className="nd-banner-sprite" src={WIZARD.cast} alt="" />
  if ('sprite' in v) return <span className="nd-banner-monster"><MonsterImg id={v.sprite} /></span>
  return (
    <span>
      {v.icons.map((n, i) => (
        <Icon key={i} name={n} size={v.icons.length > 1 && i !== 1 ? 60 : 110} />
      ))}
    </span>
  )
}

export default function DuelPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const walkOverride = TEST_HOOKS ? Number(params.get('walk')) || undefined : undefined
  const game = useDuelGame({ walkOverride })
  const { state } = game
  const landscape = useLandscape()
  const settings = useProgressStore((s) => s.settings)
  const setDuelMusic = useProgressStore((s) => s.setDuelMusic)
  const bestScore = useProgressStore((s) => s.duel.bestScore)
  const shakeCtl = useAnimationControls()

  useEffect(() => {
    preloadDuelImages()
    preloadDuelAudio()
  }, [])
  useEffect(() => {
    if (!game.shake) return
    const s = game.shake.power
    void shakeCtl.start({ x: [0, -s, s, -s * 0.6, s * 0.6, -s * 0.2, 0], y: [0, s * 0.5, -s * 0.5, s * 0.3, -s * 0.2, 0, 0], transition: { duration: 0.45 } })
  }, [game.shake, shakeCtl])

  const missed = useMemo(
    () => Object.entries(state.runMisses).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => markById(id)),
    [state.runMisses],
  )
  const playing = state.phase === 'playing'

  return (
    <div className={`nd-root${landscape ? ' nd-landscape' : ''}`} dir="rtl">
      <RuneGlowDefs />
      <motion.div className="nd-screen" animate={shakeCtl}>
        <Starfield />
        <DuelHud hearts={state.hearts} score={state.score} combo={state.combo} mega={state.mega} megaMax={MEGA_MAX}
          kills={state.kills} killsPerWave={MONSTERS_PER_WAVE} onPause={game.pause} />
        <Battlefield round={state.round} outcome={state.outcome} walking={state.walking} paused={state.paused}
          landscape={landscape} banner={game.banner ? <Banner v={game.banner} /> : null} bossHp={state.bossHp} onReplay={game.replayClue} />
        <div className="nd-pad-area">
          <div className="nd-prompt">{state.round ? <Icon name={PROMPT_ICON[state.round.type]} size={32} /> : null}</div>
          {state.mega >= MEGA_MAX && state.round && !state.outcome && playing && (
            <motion.button className="nd-mega-btn" style={{ x: '-50%' }} animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.6 }} onClick={game.megaCast} aria-label="mega">
              <Icon name="bolt" size={40} />
            </motion.button>
          )}
          {state.round && (
            <SpellPad round={state.round} outcome={state.outcome} twinTried={state.twinTried} oneRow={landscape}
              onChoose={game.choose} showTestHooks={TEST_HOOKS} />
          )}
        </div>
      </motion.div>

      {state.phase === 'idle' && (
        <StartCover onPlay={game.start} musicOn={duelMusicOn(settings)} onToggleMusic={() => setDuelMusic(!duelMusicOn(settings))}
          onParent={() => navigate('/progress')} />
      )}
      {state.paused && playing && <PauseCover onResume={game.resume} />}
      {state.phase === 'over' && (
        <RunSummary wave={state.wave} score={state.score} bestCombo={state.bestCombo} best={bestScore} newBest={game.newBest}
          missed={missed} onSay={(m) => void game.sayMark(m)} onReplay={game.start} />
      )}
    </div>
  )
}
