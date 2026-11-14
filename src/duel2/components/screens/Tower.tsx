// The first duel's tower as a screen of Book 2's run (spec: one duel, Part 3): the duel's own board (Battlefield and
// SpellPad, its rules and timing in useDuelGame's embedded mode), drawn over the stage under Book 2's top bar. No DuelHud
// (the top bar shows the run's hearts, stars and coins) and none of the duel's covers: Book 2's pause cover holds, and the
// run's summary ends the run. The מגה spell is the duel's (the parent brought it back, 2026-11-14): its lightning button
// sits above the rune row, as in the duel.
import { useEffect } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { useDuelGame } from '../../../hooks/useDuelGame'
import { Battlefield, EMBEDDED_LANDSCAPE_QUERY, useLandscape } from '../../../components/duel/Battlefield'
import { SpellPad } from '../../../components/duel/SpellPad'
import { RuneGlowDefs } from '../../../components/duel/RuneGlyph'
import { ComboBurst } from '../../../components/duel/ComboBurst'
import { Banner, Starfield } from '../../../components/duel/Starfield'
import { Icon } from '../../../components/duel/Icon'
import { MEGA_MAX } from '../../../utils/duel/rules'
import { useDuel2Store } from '../../store'
import type { TowerView } from '../../controller'
import { TEST_HOOKS } from '../../testHooks'
import '../../../components/duel/duel.css'

export interface TowerProps {
  view: TowerView
  paused: boolean
  /** the gallery: nothing is recorded */
  dry?: boolean
  onAnswer: (r: 'right' | 'wrong', markId: string) => 'on' | 'over'
  onDone: (lastWave: number) => void
  /** a wave ended in the middle of the visit: true ends the visit there (stage 0 passed) */
  onWaveEnd?: (wave: number) => boolean
  /** a מגה kill: no answer for the run (no star, no streak, no heart); tracked on its own */
  onMega?: (markId: string) => void
  /** the מגה charge changed: the run keeps it for its next tower visit (view.mega) */
  onCharge?: (mega: number) => void
}

export function Tower({ view, paused, dry, onAnswer, onDone, onWaveEnd, onMega, onCharge }: TowerProps) {
  const settings = useDuel2Store((s) => s.settings)
  const game = useDuelGame({
    embedded: {
      wave: view.wave, waves: view.waves, boss: view.boss, seen: useDuel2Store.getState().demosSeen,
      onSeen: (key) => { if (!dry) useDuel2Store.getState().markDemo(key) },
      owed: dry ? [] : useDuel2Store.getState().towerOwed ?? [],
      onIntroduced: (id) => { if (!dry) useDuel2Store.getState().monsterIntroduced(id) },
      onAnswer, onDone, audio: { sfx: settings.sfx, volume: settings.volume }, dry,
      placement: !dry && !!view.placement, onWaveEnd: dry ? undefined : onWaveEnd,
      mega: view.mega, onMega, onCharge,
    },
  })
  const { state } = game
  // Book 2 is played sideways only: a phone on its side gets the one-row board (the portrait board left no field)
  const landscape = useLandscape(EMBEDDED_LANDSCAPE_QUERY)
  const shakeCtl = useAnimationControls()
  // one visit per mount (the run gives each visit its own key)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { game.start() }, [])
  // the run pauses and resumes the board (a lock): the same monster goes on after the resume
  useEffect(() => {
    if (paused) game.pause()
    else game.resume()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])
  useEffect(() => {
    if (!game.shake) return
    const s = game.shake.power
    void shakeCtl.start({ x: [0, -s, s, -s * 0.6, s * 0.6, -s * 0.2, 0], y: [0, s * 0.5, -s * 0.5, s * 0.3, -s * 0.2, 0, 0], transition: { duration: 0.45 } })
  }, [game.shake, shakeCtl])
  return (
    <div className={`nd-root nd-embedded${landscape ? ' nd-landscape' : ''}`} dir="rtl" data-tower={view.boss ? 'boss' : 'waves'}
      data-cue={game.cue ?? undefined} data-hidden={game.hidden.length ? game.hidden.join(' ') : undefined}>
      <RuneGlowDefs />
      <motion.div className="nd-screen" animate={shakeCtl}>
        <Starfield />
        <Battlefield round={state.round} outcome={state.outcome} walking={state.walking} paused={state.paused}
          landscape={landscape} banner={game.banner ? <Banner v={game.banner} /> : null} bossHp={state.bossHp} speaking={game.speaking} fx={game.fx}
          resultBanner={game.feedback?.banner ?? true} onReplay={game.replayClue} points={false} timeLine={false} />
        {game.celebrate && <ComboBurst key={game.celebrate.at} combo={game.celebrate.combo} />}
        <div className="nd-pad-area">
          {state.mega >= MEGA_MAX && game.lightning && state.round && !state.paused && !paused && (
            <motion.button className="nd-mega-btn" style={{ x: '-50%' }} initial={{ scale: 0, rotate: -120 }}
              animate={{ scale: [0, 1.9, 0.9, 1.15, 1], rotate: [-120, 20, -10, 0, 0] }}
              transition={{ duration: 0.9, ease: 'easeOut' }} onClick={game.megaCast} aria-label="mega">
              <Icon name="bolt" size={40} />
            </motion.button>
          )}
          {state.round && (
            <SpellPad round={state.round} outcome={state.outcome} twinTried={state.twinTried} oneRow={landscape}
              onChoose={game.choose} showTestHooks={TEST_HOOKS} locked={state.preview} />
          )}
        </div>
      </motion.div>
    </div>
  )
}
