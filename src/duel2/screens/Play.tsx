// The play screen: the current screen, the top bar, the overlays and the pause cover, driven by the run controller.
import { useRef, useState } from 'react'
import { useRun } from '../useRun'
import type { RunOpts, View } from '../controller'
import { item as itemOf, mark as markOf } from '../logic/content'
import { Broom, LANE_Y, WIZ_X } from '../components/screens/Broom'
import { Cauldron, ORB_X, ORB_Y } from '../components/screens/Cauldron'
import { Ladder, LADDER_PLATE_X, plateYs } from '../components/screens/Ladder'
import { Ghosts, GHOST_H, GHOST_SLOTS } from '../components/screens/Ghosts'
import { Doors, KEY_X } from '../components/screens/Doors'
import { Crystal } from '../components/screens/Crystal'
import { TopBar } from '../components/TopBar'
import { ExplainPanel } from '../components/ExplainPanel'
import { DemoHand } from '../components/DemoHand'
import { DotOverlay, ExplainOverlay, HintCard, WordLink } from './Overlays'
import { PauseCover } from './PauseCover'
import { MistakeFx } from '../components/MistakeFx'
import { holdAudio } from '../audio/duel2Audio'
import { TEST_HOOKS } from '../testHooks'

type Run = ReturnType<typeof useRun>

function ScreenFor({ run, v, demoT }: { run: Run; v: View; demoT?: number }) {
  const s = v.screen
  if (!s) return null
  const pick = (id: string) => run.onGesture({ type: 'pick', id })
  const test = TEST_HOOKS && v.phase === 'answer'
  switch (s.screen) {
    case 'broom':
      return <Broom waves={s.waves} travelMs={s.travelMs} lane={demoT !== undefined ? (demoT > 0.55 ? 0 : 1) : s.lane} onLane={(lane) => run.onGesture({ type: 'lane', lane })} phase={v.phase} reveal={s.reveal} missed={s.missed} clock={run.clock}
        correctId={TEST_HOOKS ? s.target.id : undefined} />
    case 'cauldron':
      return <Cauldron letter={itemOf(s.letterId)} orbs={s.orbs.map(markOf)} onPick={pick} phase={v.phase} reveal={s.reveal}
        joined={s.joined ? { id: s.target.id, item: itemOf(s.letterId), mark: markOf(s.target.mark!), text: s.target.text, soundId: s.target.soundId } : undefined}
        correct={test ? s.target.mark : undefined} demo={demoT !== undefined ? { id: s.target.mark!, t: demoT } : undefined} />
    case 'ladder':
      return <Ladder built={s.built} plates={s.plates} rungs={s.rungs} onPick={pick} phase={v.phase} reveal={s.reveal} correctId={test ? s.target.id : undefined}
        demo={demoT !== undefined ? { id: s.target.id, t: demoT } : undefined} />
    case 'ghosts':
      return <Ghosts signs={s.signs} onPick={pick} phase={v.phase} zapped={s.zapped} reveal={s.reveal} correctId={test ? s.target.id : undefined} />
    case 'doors':
      return <Doors word={s.word} lit={s.lit} keys={s.keys} onPick={pick} phase={v.phase} opening={s.opening} zooming={s.zooming} reveal={s.reveal} showCorrect={test}
        demo={demoT !== undefined ? { id: s.word.id, t: demoT } : undefined} />
    case 'crystal':
      return <Crystal kind={s.kind} onDone={() => {}} />
  }
}

/** Where the demo's hand goes on each screen: from → to, in stage coordinates. */
function demoPath(v: View): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
  const s = v.screen
  if (!s) return null
  if (s.screen === 'broom') return { from: { x: WIZ_X, y: LANE_Y[1] }, to: { x: WIZ_X, y: LANE_Y[0] } }
  if (s.screen === 'cauldron') { const i = s.orbs.indexOf(s.target.mark!); return { from: { x: ORB_X[i], y: ORB_Y }, to: { x: 800, y: 650 } } }
  if (s.screen === 'ladder') { const i = s.plates.findIndex((p) => p.id === s.target.id); return { from: { x: LADDER_PLATE_X, y: plateYs(s.built.length, s.rungs)[i] }, to: { x: 800, y: 790 - Math.min(s.built.length, s.rungs - 1) * 150 } } }
  if (s.screen === 'ghosts') { const i = s.signs.findIndex((p) => p.id === s.target.id); const g = GHOST_SLOTS[i]; return { from: { x: 300, y: 860 }, to: { x: g.x, y: g.top + GHOST_H * 0.74 } } }
  if (s.screen === 'doors') { const i = s.keys.findIndex((k) => k.id === s.word.id); return { from: { x: KEY_X[i], y: 690 }, to: { x: 800, y: 560 } } }
  return null
}

export function Play({ opts, onOver }: { opts: RunOpts; onOver: (o: NonNullable<View['over']>) => void }) {
  const run = useRun(opts)
  const v = run.view
  const reported = useRef(false)
  const [demoT, setDemoT] = useState(0)
  if (v.over && !reported.current) {
    reported.current = true
    queueMicrotask(() => onOver(v.over!))
  }
  const o = v.overlay
  const missed = v.screen?.screen === 'broom' && !!v.screen.missed
  const canReplay = v.screen && v.screen.screen !== 'crystal' && v.screen.screen !== 'doors' && (v.phase === 'answer' || v.phase === 'mistake')
  return (
    <div className={`d2-root${v.phase === 'mistake' && !missed ? ' d2-shake' : ''}`} data-screen="play" data-phase={v.phase} data-kind={v.screen?.screen} data-overlay={o?.kind} data-hearts={v.hearts} aria-hidden={v.paused || undefined}>
      {o?.kind === 'demo' ? (
        <ExplainPanel parts={[{ id: o.line, highlight: 'none' }]} onNext={run.onNext} autoNext>
          {() => {
            const path = demoPath(v)
            return (
              <>
                <ScreenFor run={run} v={v} demoT={demoT} />
                {path && (
                  <svg className="d2-stage d2-overlay" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }}>
                    <DemoHand key={o.demo} from={path.from} to={path.to} durationMs={1800} onMove={setDemoT} onDone={() => {}} loop />
                  </svg>
                )}
              </>
            )
          }}
        </ExplainPanel>
      ) : <ScreenFor run={run} v={v} />}
      {o?.kind === 'explain' && <ExplainPanel key={o.target.id + o.parts.length} parts={o.parts} onNext={run.onNext} skippable>{(h) => <ExplainOverlay target={o.target} h={h} />}</ExplainPanel>}
      {o?.kind === 'dot' && <ExplainPanel key={o.hard} parts={o.parts} onNext={run.onNext} skippable>{(h) => <DotOverlay soft={o.soft} hard={o.hard} h={h} />}</ExplainPanel>}
      {o?.kind === 'hint' && <HintCard target={o.target} glow={o.glow} />}
      {o?.kind === 'word' && <WordLink word={o.word} />}
      {(!o || o.kind === 'hint' || o.kind === 'word') && (
        <TopBar hearts={v.hearts} score={v.score}
          onReplay={canReplay ? run.onReplay : undefined}
          onHint={v.hintAvailable && v.phase === 'answer' ? run.onHint : undefined}
          onNext={v.needNext ? run.onNext : undefined} />
      )}
      <MistakeFx active={v.phase === 'mistake'} kind={missed ? 'miss' : 'hit'} />
      {v.paused && <PauseCover onPlay={() => { holdAudio(false); run.resume() }} />}
    </div>
  )
}
