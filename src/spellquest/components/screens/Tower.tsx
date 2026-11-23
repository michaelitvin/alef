// The tower's tower as a screen of Spell Quest's run (spec: one duel, Part 3): the tower's own board (Battlefield and
// SpellPad, its rules and timing in useTower's embedded mode), drawn over the stage under Spell Quest's top bar. No tower HUD
// (the top bar shows the run's hearts, stars and coins) and none of the tower's covers: Spell Quest's pause cover holds, and the
// run's summary ends the run. The מגה spell is the tower's (the parent brought it back, 2026-11-14): its lightning button
// sits above the rune row, as in the tower.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { useTower } from '../../tower/useTower'
import { Battlefield, EMBEDDED_LANDSCAPE_QUERY, useLandscape } from '../../tower/components/Battlefield'
import { SpellPad } from '../../tower/components/SpellPad'
import { RuneGlowDefs } from '../../tower/components/RuneGlyph'
import { ComboBurst } from '../../tower/components/ComboBurst'
import { Banner, Starfield } from '../../tower/components/Starfield'
import { Icon } from '../../tower/components/Icon'
import { HintIcon } from '../icons'
import { BlendWord } from '../BlendWord'
import { MEGA_MAX } from '../../tower/logic/rules'
import { spellQuestTelemetry } from '../../telemetry'
import { storeSavePort } from '../../savePort'
import type { TowerView } from '../../controller'
import type { Round } from '../../tower/types'
import type { Course } from '../../course/types'
import { TEST_HOOKS } from '../../testHooks'
import '../../tower/components/tower.css'

interface TowerProps {
  view: TowerView
  paused: boolean
  /** the gallery: nothing is recorded */
  dry?: boolean
  /** (`round`: the round answered, for a course whose tower answers count: Course.tower.facts) */
  onAnswer: (r: 'right' | 'wrong', markId: string, round?: Round, helped?: true) => 'on' | 'over'
  onDone: (lastWave: number) => void
  /** a wave ended in the middle of the visit: true ends the visit there (stage 0 passed) */
  onWaveEnd?: (wave: number) => boolean
  /** a מגה kill: no answer for the run (no star, no streak, no heart); tracked on its own */
  onMega?: (markId: string) => void
  /** the מגה charge changed: the run keeps it for its next tower visit (view.mega) */
  onCharge?: (mega: number) => void
  /**
   * the course played: the tower's rounds, spoken parts, tallies and line player, the save that keeps what was explained
   * and the owed monsters, the log, and its placement check's rounds (`view.placement`) (unset: the Hebrew course's,
   * Spell Quest's save and log)
   */
  course?: Pick<Course, 'tower' | 'save' | 'telemetry' | 'placement'> & Partial<Pick<Course, 'dir'>>
}

/** the gallery records nothing, its events neither */
const NO_TELEMETRY = { track: () => {}, flush: () => {} }

/** the room between the tower and the ? of a word round */
const HINT_AIR = 12
/**
 * Where the ? of a word round goes (its left, in the pad area's px): right of the tower, so that it never covers the
 * tower's door (on a phone on its side the ground under the tower is too low for it). The tower's size follows the
 * screen's (tower.css), so it is measured; null until then (the CSS place).
 */
function useBesideTower(root: RefObject<HTMLDivElement | null>, on: boolean): number | null {
  const [left, setLeft] = useState<number | null>(null)
  useLayoutEffect(() => {
    const tower = root.current?.querySelector('.nd-tower')
    const pad = root.current?.querySelector('.nd-pad-area')
    if (!on || !tower || !pad) return
    const place = () => setLeft(Math.round(tower.getBoundingClientRect().right - pad.getBoundingClientRect().left + HINT_AIR))
    place()
    const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    watch?.observe(tower)
    watch?.observe(pad)
    return () => watch?.disconnect()
  }, [root, on])
  return left
}

export function Tower({ view, paused, dry, onAnswer, onDone, onWaveEnd, onMega, onCharge, course }: TowerProps) {
  const tower = course?.tower
  // one of each per mount (the controller is made once)
  const [tallies] = useState(() => tower?.tallies())
  const [save] = useState(() => (course ? course.save() : storeSavePort))
  // the course's placement check plays its own rounds at a fixed walk, with no מגה spell (Hebrew has none: its stage 0
  // plays the tower's)
  const [placing] = useState(() => (!dry && view.placement && course?.placement ? course.placement : null))
  const [content] = useState(() => (placing ? placing.tower(save) : tower?.content))
  const game = useTower({
    content, tallies, audio: tower?.audio, walkOverride: placing?.walkMs,
    embedded: {
      wave: view.wave, waves: view.waves, boss: view.boss, seen: save.read().demosSeen,
      onSeen: (key) => { if (!dry) save.markDemo(key) },
      owed: dry ? [] : save.read().towerOwed ?? [],
      onIntroduced: (id) => { if (!dry) save.monsterIntroduced(id) },
      onAnswer, onDone, dry,
      // a course whose tower answers count (Course.tower.facts) gets the round answered
      // (the third argument only when helped, so that every other answer is reported as it always was)
      onAnswerRound: tower?.facts ? (r, round, helped) => (helped ? onAnswer(r, round.target.id, round, helped) : onAnswer(r, round.target.id, round)) : undefined,
      placement: !dry && !!view.placement, onWaveEnd: dry ? undefined : onWaveEnd,
      mega: view.mega, onMega, onCharge, megaOff: !!placing,
    },
    // the tower's events go to the course's log (via: 'tower'), in its run (ADR 0004; Hebrew: Spell Quest's)
    telemetry: dry ? NO_TELEMETRY : course?.telemetry ?? spellQuestTelemetry,
  })
  const { state } = game
  // Spell Quest is played sideways only: a phone on its side gets the one-row board (the portrait board left no field)
  const landscape = useLandscape(EMBEDDED_LANDSCAPE_QUERY)
  const root = useRef<HTMLDivElement>(null)
  const hinting = game.canHint && state.walking && !!state.round && !state.outcome && !state.preview && !state.paused && !paused
  const hintLeft = useBesideTower(root, hinting)
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
    <div ref={root} className={`nd-root nd-embedded${landscape ? ' nd-landscape' : ''}`} dir="rtl" data-tower={view.boss ? 'boss' : 'waves'}
      data-cue={game.cue ?? undefined} data-hidden={game.hidden.length ? game.hidden.join(' ') : undefined}>
      <RuneGlowDefs />
      <motion.div className="nd-screen" animate={shakeCtl}>
        <Starfield />
        <Battlefield art={tower?.art} round={state.round} outcome={state.outcome} walking={state.walking} paused={state.paused} held={game.held}
          landscape={landscape} banner={game.banner ? <Banner v={game.banner} /> : null} bossHp={state.bossHp} speaking={game.speaking} fx={game.fx}
          resultBanner={game.feedback?.banner ?? true} onReplay={game.replayClue} points={false} timeLine={false} />
        {game.blend && <BlendWord parts={game.blend.parts} lit={game.blend.lit} />}
        {game.celebrate && <ComboBurst key={game.celebrate.at} combo={game.celebrate.combo} />}
        {/* the pad reads in the course's direction (the board is right to left; English runes run left to right); Hebrew: no attribute */}
        <div className="nd-pad-area" {...(course?.dir === 'ltr' ? { dir: 'ltr' } : {})}>
          {!placing && state.mega >= MEGA_MAX && game.lightning && state.round && !state.paused && !paused && (
            <motion.button className="nd-mega-btn" style={{ x: '-50%' }} initial={{ scale: 0, rotate: -120 }}
              animate={{ scale: [0, 1.9, 0.9, 1.15, 1], rotate: [-120, 20, -10, 0, 0] }}
              transition={{ duration: 0.9, ease: 'easeOut' }} onClick={game.megaCast} aria-label="mega">
              <Icon name="bolt" size={40} />
            </motion.button>
          )}
          {/* the hint of a word round (English): the words on the runes blend, left to right */}
          {hinting && (
            <button type="button" className="nd-hint-btn" aria-label="hint" onClick={game.hint} style={hintLeft === null ? undefined : { left: hintLeft }}><HintIcon /></button>
          )}
          {state.round && (
            <SpellPad round={state.round} outcome={state.outcome} twinTried={state.twinTried} oneRow={landscape}
              onChoose={game.choose} showTestHooks={TEST_HOOKS} locked={state.preview} content={content} />
          )}
        </div>
      </motion.div>
    </div>
  )
}
