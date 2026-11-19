// The play screen: the current screen, the top bar, the overlays and the pause cover, driven by the run controller.
import { usePlaytime } from '../../shared/playtime'
import { useEffect, useRef, useState } from 'react'
import { useRun } from '../useRun'
import { ladderAnswerId, type RunOpts, type View } from '../controller'
import type { Course } from '../course/types'
import { item as itemOf, mark as markOf, type MarkId } from '../logic/content'
import { Broom } from '../components/screens/Broom'
import { LANE_Y, WIZ_X, flightPath } from '../broomLayout'
import { Cauldron, CauldronWord, ORB_X, ORB_Y, TILE_X } from '../components/screens/Cauldron'
import { Ladder, LADDER_CX, LADDER_PLATE_X, ladderView, nextRungY, plateTop, plateYs, rungPlaceX } from '../components/screens/Ladder'
import { Ghosts, GHOST_H, GHOST_SLOTS } from '../components/screens/Ghosts'
import { Doors, KEY_X } from '../components/screens/Doors'
import { Crystal } from '../components/screens/Crystal'
import { Draw } from '../components/screens/Draw'
import { TouchAnswer } from '../components/DragPick'
import { Merchant } from '../components/screens/Merchant'
import { Tower } from '../components/screens/Tower'
import { TopBar } from '../components/TopBar'
import { ExplainPanel } from '../components/ExplainPanel'
import { BlendWord } from '../components/BlendWord'
import { DemoHand } from '../components/DemoHand'
import { DotOverlay, ExplainOverlay, HintCard, WordLink } from './Overlays'
import { PauseCover } from './PauseCover'
import { MistakeFx } from '../components/MistakeFx'
import { HealFly } from '../components/HealFly'
import { holdAudio } from '../../shared/gameAudio/output'
import { useCourse, useCourseSave } from '../course/CourseContext'
import { TEST_HOOKS } from '../testHooks'
import { useWizardArt } from '../assets/images'
import { BAND_CONTENT_W, homeInBar, layoutVars, nextInMiddle, STAGE_CONTENT_TOP, viewBoxOf } from '../layout'

type Run = ReturnType<typeof useRun>

function ScreenFor({ run, v, demoT, dry, size, course }: {
  run: Run; v: View; demoT?: number; dry?: boolean; size?: { w: number; h: number }
  /** the course played (RunOpts.course; unset: Hebrew): the tower takes its content, save and log from it */
  course?: Course
}) {
  const s = v.screen
  if (!s) return null
  const pick = (id: string) => run.onGesture({ type: 'pick', id })
  const test = TEST_HOOKS && v.phase === 'answer'
  const dir = v.course.dir
  switch (s.screen) {
    case 'broom':
      return <Broom waves={s.waves} travelMs={s.travelMs} lane={demoT !== undefined ? (demoT > 0.55 ? 0 : 1) : s.lane} onLane={(lane) => run.onGesture({ type: 'lane', lane })} phase={v.phase} reveal={s.reveal} missed={s.missed} fx={s.fx} finished={s.finished} boss={s.boss} clock={run.clock}
        correctId={TEST_HOOKS ? s.target.id : undefined} size={size} dir={dir} />
    case 'cauldron':
      if (s.tiles) {
        const answer = s.boxes![s.gap!]
        return <CauldronWord dir={dir} boxes={s.boxes!} gap={s.gap!} tiles={s.tiles} target={s.target} shown={s.shown} onPick={pick} phase={v.phase} reveal={s.reveal}
          joined={s.joined} correct={test ? answer.id : undefined} demo={demoT !== undefined ? { id: answer.id, t: demoT } : undefined} />
      }
      return <Cauldron dir={dir} letter={itemOf(s.letterId)} orbs={s.orbs.map(markOf)} onPick={pick} phase={v.phase} reveal={s.reveal as { right: MarkId; wrong?: MarkId } | undefined}
        joined={s.joined ? { id: s.target.id, item: itemOf(s.letterId), mark: markOf(s.target.mark!), text: s.target.text, soundId: s.target.soundId } : undefined}
        correct={test ? s.target.mark : undefined} demo={demoT !== undefined ? { id: s.target.mark!, t: demoT } : undefined} />
    case 'ladder':
      return <Ladder built={s.built} plates={s.plates} rungs={s.rungs} onPick={(id, box) => run.onGesture({ type: 'pick', id, ...(box !== undefined ? { box } : {}) })} phase={v.phase} reveal={s.reveal} correctId={test ? ladderAnswerId(s) : undefined}
        demo={demoT !== undefined ? { id: ladderAnswerId(s), t: demoT } : undefined} size={size} dir={dir}
        {...(s.from ? { change: { from: s.from, at: s.at!, grow: s.grow, marked: !!s.marked } } : {})} />
    case 'ghosts':
      return <Ghosts dir={dir} signs={s.signs} onPick={pick} phase={v.phase} zapped={s.zapped} reveal={s.reveal} correctId={test ? s.target.id : undefined} />
    case 'doors':
      return <Doors dir={dir} word={s.word} plate={s.plate} lit={s.lit} keys={s.keys} onPick={pick} phase={v.phase} opening={s.opening} zooming={s.zooming} reveal={s.reveal} showCorrect={test} behind={s.behind}
        demo={demoT !== undefined ? { id: s.word.id, t: demoT } : undefined} />
    case 'crystal':
      return <Crystal kind={s.kind} onDone={() => {}} />
    case 'draw':
      return <Draw view={s} phase={v.phase} onStroke={(pts) => run.onGesture({ type: 'stroke', pts })} />
    case 'tower':
      // the duel's own board, over the stage (HTML, not the stage's SVG); one mount per visit
      return <Tower key={s.visit} view={s} paused={v.paused} dry={dry} onAnswer={run.towerAnswer} onDone={run.towerDone} onWaveEnd={run.towerWaveEnd}
        onMega={run.towerMega} onCharge={run.towerCharge} course={course} />
  }
}

/** Where the demo's hand goes on each screen: from → to, in stage coordinates. */
function demoPath(v: View, size: { w: number; h: number }): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
  const s = v.screen
  if (!s) return null
  if (s.screen === 'broom') return { from: { x: WIZ_X, y: LANE_Y[1] }, to: { x: WIZ_X, y: LANE_Y[0] } }
  if (s.screen === 'cauldron' && s.tiles) { const i = s.tiles.findIndex((x) => x.id === s.boxes![s.gap!].id); return { from: { x: TILE_X[i], y: ORB_Y }, to: { x: 800, y: 650 } } }
  if (s.screen === 'cauldron') { const i = s.orbs.indexOf(s.target.mark!); return { from: { x: ORB_X[i], y: ORB_Y }, to: { x: 800, y: 650 } } }
  if (s.screen === 'ladder') {
    const i = s.plates.findIndex((p) => p.id === ladderAnswerId(s))
    // (an English rung: the hand goes to the place that changes)
    const x = s.from ? rungPlaceX({ from: s.from, at: s.at!, grow: s.grow, marked: !!s.marked }) : LADDER_CX
    return { from: { x: LADDER_PLATE_X, y: plateYs(s.built.length, s.rungs, plateTop(ladderView(size)))[i] }, to: { x, y: nextRungY(s.built.length, s.rungs) } }
  }
  if (s.screen === 'ghosts') { const i = s.signs.findIndex((p) => p.id === s.target.id); const g = GHOST_SLOTS[i]; return { from: { x: 300, y: 860 }, to: { x: g.x, y: g.top + GHOST_H * 0.74 } } }
  if (s.screen === 'doors') { const i = s.keys.findIndex((k) => k.id === s.word.id); return { from: { x: KEY_X[i], y: 690 }, to: { x: 800, y: 560 } } }
  return null
}

/** the demo hand's view: the flight's own (it fills the screen's width), the ladder's in the band, else the stage's */
function overlayViewBox(v: View, size: { w: number; h: number }): string {
  const full = fullView(v, size)
  if (full) return viewBoxOf(full)
  if (v.screen?.screen !== 'broom') return '0 0 1600 900'
  const view = flightPath(size).view
  return `${view.left} 0 ${view.width.toFixed(1)} 900`
}

/** the window's size (the stage's box depends on it) */
function useWindowSize() {
  const get = () => ({ w: window.innerWidth, h: window.innerHeight })
  const [size, setSize] = useState(get)
  useEffect(() => {
    const f = () => setSize(get())
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return size
}

/** a screen whose view fills the whole screen (layout.ts intoBandView): the ladder on a phone on its side */
function fullView(v: View, size: { w: number; h: number }) {
  return !v.merchant && v.screen?.screen === 'ladder' ? ladderView(size) : null
}

/** the topmost content's stage y on this screen (layout.ts) */
function contentTop(v: View): number {
  if (v.merchant) return STAGE_CONTENT_TOP.merchant
  const s = v.screen
  if (!s) return 0
  if (s.screen === 'draw') return STAGE_CONTENT_TOP[s.script === 'hand' ? 'draw-hand' : 'draw']
  return STAGE_CONTENT_TOP[s.screen] ?? 0
}
/** the width of the content that rises into the top band on a phone (layout.ts: the doors), if any */
const bandWidth = (v: View): number | undefined => (v.merchant || !v.screen ? undefined : BAND_CONTENT_W[v.screen.screen])

export function Play({ opts, onOver, onExit }: {
  opts: RunOpts; onOver: (o: NonNullable<View['over']>) => void
  /** a full run: the held home button leaves the run (it stops first: RunController.exit); none in a session or the gallery */
  onExit?: () => void
}) {
  // the course the run plays: the one given, else the page's (CourseContext; Hebrew without a provider)
  const page = useCourse()
  const course = opts.course ?? page
  const run = useRun({ ...opts, course })
  const wiz = useWizardArt()
  const coins = useCourseSave((s) => s.coins ?? 0)
  const v = run.view
  // play time for the parent's Progress section, under the course's game: not in the gallery's sandbox, not under the pause cover
  usePlaytime(course.game, !opts.sandbox && !v.paused && !v.over)
  const size = useWindowSize()
  const reported = useRef(false)
  const [demoT, setDemoT] = useState(0)
  // finger-down on an answer, or the pen down: a hint that shows goes away (rule)
  const touch = (by: 'answer' | 'pen') => run.onGesture({ type: 'touch', by })
  if (v.over && !reported.current) {
    reported.current = true
    queueMicrotask(() => onOver(v.over!))
  }
  const o = v.overlay
  const missed = v.screen?.screen === 'broom' && !!v.screen.missed
  // the flight does not stop at a mistake: its flash and shake come from the broom's fx, once per mistake
  const bfx = v.screen?.screen === 'broom' ? v.screen.fx : undefined
  const [shake, setShake] = useState<number | null>(null)
  useEffect(() => {
    if (bfx?.kind !== 'hit') return
    setShake(bfx.id)
    const id = bfx.id
    const timer = window.setTimeout(() => setShake((x) => (x === id ? null : x)), 450)
    return () => window.clearTimeout(timer)
  }, [bfx?.id, bfx?.kind])
  // the merchant's visit has one help button (?) that replays his walkthrough, and no speaker (the parent)
  // (the tower has its own speaker on the duel's board)
  const into = fullView(v, size) ? 'full' : bandWidth(v)
  // the way home (a 2 s hold): a full run only, in the bar's corner unless the content rises into the band there (layout.ts)
  const exit = onExit && !opts.session && !opts.sandbox ? () => { run.exit(); onExit() } : undefined
  const homeBar = !!exit && !v.over && homeInBar(size, contentTop(v), into, v.merchant ? 'merchant' : v.screen?.screen)
  const canReplay = v.merchant ? false : v.screen && v.screen.screen !== 'crystal' && v.screen.screen !== 'doors' && v.screen.screen !== 'tower' && (v.phase === 'answer' || v.phase === 'mistake')
  return (
    <TouchAnswer.Provider value={touch}>
    <div {...(v.course.dir === 'ltr' ? { dir: 'ltr' } : {})} data-course={v.course.id} className={`d2-root${(v.phase === 'mistake' && !missed) || shake !== null ? ' d2-shake' : ''}`} data-screen="play" data-phase={v.phase} data-kind={v.merchant ? 'merchant' : v.screen?.screen} data-overlay={o?.kind} data-hearts={opts.session ? undefined : v.hearts} data-session={opts.session?.screen} data-defeat={v.defeat || undefined} aria-hidden={v.paused || undefined}
      style={layoutVars(size, contentTop(v), into)}>
      {o?.kind === 'demo' ? (
        <ExplainPanel parts={[{ id: o.line, highlight: 'none' }]} onNext={run.onNext} autoNext>
          {() => {
            const path = demoPath(v, size)
            return (
              <>
                <ScreenFor run={run} v={v} demoT={demoT} size={size} course={course} />
                {path && (
                  <svg className="d2-stage d2-overlay" viewBox={overlayViewBox(v, size)} preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }}>
                    <DemoHand key={o.demo} from={path.from} to={path.to} durationMs={1800} onMove={setDemoT} onDone={() => {}} loop />
                  </svg>
                )}
              </>
            )
          }}
        </ExplainPanel>
      ) : v.merchant ? (
        <Merchant v={v.merchant} onCoin={(value) => run.onGesture({ type: 'coin', value })} onHand={() => run.onGesture({ type: 'hand' })}
          onPotion={() => run.onGesture({ type: 'potion' })} onDecline={() => run.onGesture({ type: 'decline' })} />
      ) : <ScreenFor run={run} v={v} dry={opts.sandbox} size={size} course={course} />}
      {o?.kind === 'explain' && <ExplainPanel key={o.target.id + o.parts.length} parts={o.parts} onNext={run.onNext} skippable>{(h) => <ExplainOverlay target={o.target} h={h} />}</ExplainPanel>}
      {o?.kind === 'dot' && <ExplainPanel key={o.hard} parts={o.parts} onNext={run.onNext} skippable>{(h) => <DotOverlay soft={o.soft} hard={o.hard} h={h} />}</ExplainPanel>}
      {o?.kind === 'hint' && <HintCard target={o.target} glow={o.glow} />}
      {o?.kind === 'blend' && <BlendWord parts={o.parts} lit={o.lit} />}
      {o?.kind === 'word' && <WordLink word={o.word} />}
      {(!o || o.kind === 'hint' || o.kind === 'blend' || o.kind === 'word') && (
        <TopBar hearts={opts.session ? undefined : v.hearts} score={v.score} coins={v.coins ?? coins} mult={v.mult} heartFlash={v.heartFlash}
          onReplay={canReplay ? run.onReplay : undefined}
          onHint={v.hintAvailable && v.phase === 'answer' ? run.onHint : undefined} hintGlow={v.hintGlow} help={!!v.merchant}
          onNext={v.needNext ? run.onNext : undefined} nextSide={!nextInMiddle(size.w, homeBar)} onHome={homeBar ? exit : undefined} />
      )}
      <MistakeFx active={v.phase === 'mistake'} kind={missed ? 'miss' : 'hit'} />
      {bfx && <MistakeFx key={bfx.id} active kind={bfx.kind} />}
      {v.heal && <HealFly key={v.heal.id} from={v.heal.from} />}
      {/* the hearts ran out: the dizzy wizard spins and falls, then the summary (no offer, no "continue?") */}
      {/* the defeat scene's picture is decoded before it is needed (rule: no late pictures); the broom draws it anyway */}
      {!v.defeat && wiz('s-wizard-dizzy') && <div data-warm className="d2-warm" aria-hidden><img src={wiz('s-wizard-dizzy')} alt="" draggable={false} /></div>}
      {v.defeat && <div data-defeat className="d2-defeat">{wiz('s-wizard-dizzy') && <img src={wiz('s-wizard-dizzy')} alt="" draggable={false} />}</div>}
      {v.paused && <PauseCover onPlay={() => { holdAudio(false); run.resume() }} onHome={exit} />}
    </div>
    </TouchAnswer.Provider>
  )
}
