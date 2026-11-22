import { describe, expect, it } from 'vitest'
import { HEARTS, SESSION_LENGTH, VISIT } from '../logic/run'
import {
  DEFEAT_MS, DEFEAT_REST_MS, DEFEAT_RING_MS,
  runPass, stepPass, visitLength,
  type PassFacts, type PassInput, type PassMode, type PassState, type PassStep, type Wait,
} from './pass'

/** freezes a state deeply: a step that changed it would throw */
function freeze<T>(x: T): T {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) freeze(v) }
  return x
}

/** stage 4, drawing off, the book open: tower → broom → cauldron → ladder → ghosts → doors → (crystal) → spell */
const facts = (f: Partial<PassFacts> = {}): PassFacts => ({
  stage: 4, draw: false, screensOpen: true, recent: {}, towerRecent: {}, cycleNo: 0, towerTail: '', ...f,
})
/** a screen's recent answers, all right (mastered) */
const mastered = (screen: string) => ({ [`sc:${screen}`]: 'o'.repeat(20) })

function pass(c: { mode?: PassMode; lastEnded?: PassState['screen'] | null; screen?: PassState['screen']; facts?: PassFacts } = {}) {
  let st = runPass({ mode: c.mode ?? 'run', lastEnded: (c.lastEnded ?? null) as never, screen: c.screen, facts: c.facts ?? facts() })
  let clock = 0
  const all: PassStep[] = []
  const send = (e: PassInput) => {
    const r = stepPass(freeze(st), { ...e, at: clock })
    st = r.state
    all.push(r)
    return r
  }
  return {
    send, all,
    get state() { return st },
    pass(ms: number) { clock += ms },
    /** the screen is over: the next one (with these facts) */
    done(f = facts()) { return send({ type: 'screen-done', facts: f, score: 0 }) },
    lose(n = 1) { for (let i = 0; i < n; i++) send({ type: 'answer', a: 'wrong' }) },
  }
}

describe('the pass policy', () => {
  describe('where a run starts, and the cycle', () => {
    it('a run starts after the screen where the last ended; a session or the gallery at its screen; full hearts', () => {
      expect(pass({ lastEnded: 'ladder' }).state).toMatchObject({ screen: 'ghosts', hearts: { left: HEARTS, nearMissUsed: false }, full: false })
      expect(pass({ lastEnded: 'doors' }).state).toMatchObject({ screen: 'spell', full: false })
      expect(pass({ lastEnded: 'spell' }).state).toMatchObject({ screen: 'tower', full: true })
      expect(pass({ mode: 'session', screen: 'cauldron' }).state).toMatchObject({ screen: 'cauldron', full: false })
      expect(pass({ mode: 'gallery', screen: 'broom' }).state.screen).toBe('broom')
      expect(pass({ facts: facts({ screensOpen: false }) }).state).toMatchObject({ screen: 'tower', full: true })
    })

    it('screens in their cycle, with a checkpoint between two; the doors, then their crystal (no checkpoint between), then the spell book', () => {
      const p = pass({ lastEnded: 'spell' })
      const seen: string[] = [p.state.screen]
      let r = p.done()
      for (let i = 0; i < 8; i++) {
        if (i) r = p.done()
        seen.push(p.state.screen)
        expect(p.state.checkpointDue).toBe(p.state.screen !== 'crystal')
        expect(!!r.fresh).toBe(p.state.screen !== 'crystal')
        if (p.state.checkpointDue) p.send({ type: 'visited' })
      }
      expect(seen).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'crystal', 'spell', 'tower'])
      expect(r.save).toEqual([{ op: 'nextCycle' }])
    })

    it('a long-mastered screen is skipped in odd cycles (tracked; no visit, no checkpoint of its own)', () => {
      const f = facts({ recent: mastered('cauldron'), cycleNo: 1 })
      const p = pass({ lastEnded: 'tower' })
      const r = p.done(f)
      expect(p.state.screen).toBe('ladder')
      expect(r.track).toEqual([{ e: 'skip', data: { screen: 'cauldron', cycle: 1 } }])
      const even = pass({ lastEnded: 'tower' })
      even.done({ ...f, cycleNo: 2 })
      expect(even.state.screen).toBe('cauldron')
    })

    it('skipped doors: their crystal still comes at the end of the cycle, then the next cycle', () => {
      const f = facts({ recent: mastered('doors'), cycleNo: 1 })
      const p = pass({ lastEnded: 'ladder' })
      p.done(f)
      expect(p.state).toMatchObject({ screen: 'spell', crystalOwed: true })
      p.done(f)
      expect(p.state).toMatchObject({ screen: 'crystal', crystalOwed: false, afterCrystal: { screen: 'tower', newCycle: true } })
    })

    it('a session never skips, and ends after its one visit with a summary', () => {
      const p = pass({ mode: 'session', screen: 'cauldron' })
      const r = p.send({ type: 'screen-done', facts: facts({ recent: mastered('ladder'), cycleNo: 1 }), score: 7 })
      expect(r).toMatchObject({ end: true, over: { crystals: 0, best: false, session: true } })
      expect(r.track).toEqual([{ e: 'session-end', data: { screen: 'cauldron', score: 7 } }])
    })

    it('the gallery starts its screen again with full hearts, and never gives a pass heart or a checkpoint', () => {
      const p = pass({ mode: 'gallery', screen: 'ghosts' })
      p.lose(2)
      const r = p.done()
      expect(r.fresh).toBe(true)
      expect(p.state).toMatchObject({ screen: 'ghosts', hearts: { left: HEARTS }, checkpointDue: false, passHearts: 0 })
      expect(r.heal).toBeUndefined()
    })
  })

  describe('the doors were skipped: their crystal', () => {
    it('comes at the cycle\'s end, then the next screen', () => {
      const p = pass({ lastEnded: 'ladder' })
      const f = facts({ recent: mastered('doors'), cycleNo: 1 })
      expect(p.state.screen).toBe('ghosts')
      expect(p.done(f).track).toEqual([{ e: 'skip', data: { screen: 'doors', cycle: 1 } }])
      // (the spell book comes after the skipped doors, before the cycle's end)
      expect(p.state.screen).toBe('spell')
      p.done(f)
      expect(p.state).toMatchObject({ screen: 'crystal', crystalOwed: false, afterCrystal: { screen: 'tower', newCycle: true } })
      expect(p.send({ type: 'crystal' }).save).toEqual([{ op: 'addCrystal' }])
      p.done(f)
      expect(p.state.screen).toBe('tower')
    })

    it('is paid once when the run ends or closes before the cycle\'s end', () => {
      // the spell book and the drawing screens come after the skipped doors, before the cycle's end
      const p = pass({ lastEnded: 'ladder', facts: facts({ draw: true }) })
      p.done(facts({ draw: true, recent: mastered('doors'), cycleNo: 1 }))
      expect(p.state.screen).toBe('spell')
      expect(p.state.crystalOwed).toBe(true)
      expect(p.send({ type: 'owed' }).save).toEqual([{ op: 'addCrystal', owed: true }])
      expect(p.send({ type: 'owed' }).save).toEqual([])
      expect(p.state.crystals).toBe(1)
    })

    it('the cycle\'s crystal is given once (a pause during it)', () => {
      const p = pass({ lastEnded: 'ghosts' })
      p.done()
      expect(p.state.screen).toBe('crystal')
      expect(p.send({ type: 'crystal' }).save).toHaveLength(1)
      expect(p.send({ type: 'crystal' }).save).toHaveLength(0)
    })
  })

  describe('the hearts', () => {
    it('a mistake costs one; a near miss is forgiven once a round; the last heart ends the run', () => {
      const p = pass()
      expect(p.send({ type: 'answer', a: 'near' }).outcome).toEqual({ forgiven: true, over: false })
      expect(p.send({ type: 'answer', a: 'near' }).outcome).toEqual({ forgiven: false, over: false })
      expect(p.state.hearts.left).toBe(2)
      p.send({ type: 'round' })
      expect(p.send({ type: 'answer', a: 'near' }).outcome!.forgiven).toBe(true)
      expect(p.send({ type: 'answer', a: 'right' }).outcome).toEqual({ forgiven: false, over: false })
      p.lose()
      expect(p.send({ type: 'answer', a: 'wrong' }).outcome).toEqual({ forgiven: false, over: true })
      expect(p.state.hearts.left).toBe(0)
    })

    it('a session from the path puts no heart at stake', () => {
      const p = pass({ mode: 'session', screen: 'ghosts' })
      for (let i = 0; i < 5; i++) expect(p.send({ type: 'answer', a: 'wrong' }).outcome).toEqual({ forgiven: false, over: false })
      expect(p.state.hearts.left).toBe(HEARTS)
      expect(p.send({ type: 'answer', a: 'near' }).outcome!.forgiven).toBe(true)
    })

    it('the end of a full pass gives one heart back, at once, with its sound and the flash', () => {
      const p = pass({ lastEnded: 'ghosts' })
      expect(p.state.full).toBe(false)
      p.lose(2)
      p.done() // the crystal
      p.done() // the spell book
      let r = p.done()
      // the run started near the cycle's end: no heart there
      expect(r.heal).toBeUndefined()
      expect(p.state).toMatchObject({ screen: 'tower', full: true, hearts: { left: 1 } })
      for (let i = 0; i < 6; i++) p.done()
      expect(p.state.screen).toBe('crystal')
      p.done()
      expect(p.state.screen).toBe('spell')
      r = p.done()
      expect(r).toMatchObject({ heal: true, run: { hearts: 2, passHeart: 1 }, sfx: ['potion'] })
      expect(r.track).toEqual([{ e: 'pass-heart', data: { hearts: 2 } }])
      expect(r.save).toEqual([{ op: 'nextCycle' }])
    })

    it('no heart when all three are there, nor at stage 0 (the tower alone)', () => {
      const p = pass({ lastEnded: 'spell' })
      for (let i = 0; i < 8; i++) expect(p.done().heal).toBeUndefined()
      const s0 = pass({ facts: facts({ screensOpen: false }) })
      s0.lose()
      const r = s0.done(facts({ screensOpen: false }))
      expect(s0.state.screen).toBe('tower')
      expect(r.heal).toBeUndefined()
      expect(r.save).toEqual([{ op: 'nextCycle' }])
    })

    it('a potion: his hearts and the next price; the gallery\'s merchant has 1 heart', () => {
      const p = pass()
      p.lose(2)
      p.send({ type: 'bought', hearts: 2 })
      expect(p.state).toMatchObject({ hearts: { left: 2 }, purchases: 1 })
      const g = pass({ mode: 'gallery', screen: 'broom' })
      g.send({ type: 'gallery-merchant' })
      expect(g.state.hearts.left).toBe(1)
    })
  })

  describe('the checkpoint', () => {
    const at = (p: ReturnType<typeof pass>, c: Partial<Extract<PassInput, { type: 'checkpoint' }>> = {}) =>
      p.send({ type: 'checkpoint', screensOpen: true, coins: 50, range: 100, sinceVisit: Infinity, bossNext: false, ...c })

    it('the merchant comes when the hearts are low and he has the coins (merchantDue), at the run\'s price', () => {
      const p = pass({ lastEnded: 'broom' })
      p.done()
      expect(at(p)).toMatchObject({ save: [{ op: 'noteCheckpoint', due: false }] })
      expect(p.state.checkpointDue).toBe(false)
      p.lose(2)
      p.done()
      const r = at(p)
      expect(r.save).toEqual([{ op: 'noteCheckpoint', due: true }])
      expect(r.merchant!.price).toBeGreaterThan(0)
      expect(p.state.checkpointDue).toBe(true)
      p.send({ type: 'visited' })
      expect(p.state.checkpointDue).toBe(false)
      // with 2 hearts: before a boss, or every other checkpoint
      const q = pass()
      q.lose()
      expect(at(q, { sinceVisit: 1 }).merchant).toBeUndefined()
      expect(at(q, { sinceVisit: 1, bossNext: true }).merchant).toBeDefined()
      expect(at(q, { sinceVisit: 1, coins: 0 }).merchant).toBeUndefined()
    })

    it('never in a session, the gallery or at stage 0 (nothing noted)', () => {
      for (const p of [pass({ mode: 'session', screen: 'broom' }), pass({ mode: 'gallery', screen: 'broom' })]) {
        p.lose(2)
        expect(at(p)).toMatchObject({ save: [] })
        expect(at(p).merchant).toBeUndefined()
      }
      const s0 = pass()
      s0.lose(2)
      expect(at(s0, { screensOpen: false })).toMatchObject({ save: [] })
    })
  })

  describe('a visit\'s length', () => {
    it('about half for a screen with no recent mistakes; the full visit otherwise, in the gallery and at stage 0\'s tower', () => {
      expect(visitLength('run', 'ghosts', facts())).toBe(VISIT.ghosts)
      expect(visitLength('run', 'ghosts', facts({ recent: mastered('ghosts') }))).toBe(Math.max(2, Math.round(VISIT.ghosts / 2)))
      expect(visitLength('run', 'ghosts', facts({ recent: { 'sc:ghosts': 'ooooooox' } }))).toBe(VISIT.ghosts)
      expect(visitLength('gallery', 'ghosts', facts({ recent: mastered('ghosts') }))).toBe(VISIT.ghosts)
      expect(visitLength('session', 'ghosts', facts())).toBe(SESSION_LENGTH.ghosts)
      expect(visitLength('run', 'tower', facts({ towerTail: 'oooooooooo' }))).toBe(1)
      expect(visitLength('run', 'tower', facts({ towerTail: 'oooooooooo', screensOpen: false }))).toBe(VISIT.tower)
      // the tower before its tail is long enough: every mark's answers, none wrong
      expect(visitLength('run', 'tower', facts({ towerRecent: { a: 'oooo', b: 'oooo' } }))).toBe(1)
      expect(visitLength('run', 'tower', facts({ towerRecent: { a: 'oooo', b: 'ooox' } }))).toBe(VISIT.tower)
    })

    it('the gallery\'s visit refills the hearts (a run\'s keeps them)', () => {
      const g = pass({ mode: 'gallery', screen: 'ghosts' })
      g.lose()
      expect(g.send({ type: 'visit', screen: 'ghosts', facts: facts() }).len).toBe(VISIT.ghosts)
      expect(g.state.hearts.left).toBe(HEARTS)
      const p = pass()
      p.lose()
      p.send({ type: 'visit', screen: 'ghosts', facts: facts() })
      expect(p.state.hearts.left).toBe(HEARTS - 1)
    })
  })

  describe('the run\'s end', () => {
    function end(c: { cue?: string; score?: number; bestRun?: number } = {}) {
      const p = pass({ lastEnded: 'broom' })
      const r0 = p.send({ type: 'lost', score: c.score ?? 5, bestRun: c.bestRun ?? 3, cue: c.cue })
      const waits: Wait[] = []
      const said: string[] = []
      let r: PassStep = r0
      said.push(...r.say.map((l) => ('id' in l ? l.id : l.line)))
      while (r.wait) {
        waits.push(r.wait)
        r = p.send(r.wait.for === 'sleep' ? { type: 'slept' } : { type: 'heard' })
        said.push(...r.say.map((l) => ('id' in l ? l.id : l.line)))
      }
      return { p, r0, last: r, waits, said }
    }

    it('saves the run\'s records, says the right answer, then the defeat scene and its line, then the summary', () => {
      const e = end({ cue: 'syl-ba' })
      expect(e.r0.save).toEqual([{ op: 'endRun', screen: 'cauldron', score: 5 }])
      expect(e.r0.track).toEqual([{ e: 'run-end', data: { screen: 'cauldron', score: 5, crystals: 0 } }])
      expect(e.said).toEqual(['syl-ba', 'defeat'])
      expect(e.waits).toEqual([{ for: 'say' }, { for: 'sleep', ms: DEFEAT_RING_MS }, { for: 'say', min: DEFEAT_MS - DEFEAT_RING_MS }, { for: 'sleep', ms: DEFEAT_REST_MS }])
      expect(e.p.all[1]).toMatchObject({ run: { defeat: true, phase: 'feedback', hintAvailable: false, fixing: false }, sfx: ['hit'], track: [{ e: 'defeat', data: { screen: 'cauldron' } }] })
      expect(e.last).toMatchObject({ end: true, over: { crystals: 0, best: true } })
    })

    it('after the tower no answer is said (the duel said it); not a best run', () => {
      const e = end({ score: 2, bestRun: 3 })
      expect(e.said).toEqual(['defeat'])
      expect(e.r0.run).toMatchObject({ defeat: true })
      expect(e.last.over).toEqual({ crystals: 0, best: false })
    })

    it('the crystal of skipped doors is paid first, and counted in the summary; the crystal screen ends as the doors', () => {
      const p = pass({ lastEnded: 'ladder', facts: facts({ draw: true }) })
      p.done(facts({ draw: true, recent: mastered('doors'), cycleNo: 1 }))
      const r = p.send({ type: 'lost', score: 1, bestRun: 9 })
      expect(r.save).toEqual([{ op: 'addCrystal', owed: true }, { op: 'endRun', screen: 'spell', score: 1 }])
      expect(r.track[0]).toEqual({ e: 'run-end', data: { screen: 'spell', score: 1, crystals: 1 } })
      const c = pass({ lastEnded: 'ghosts' })
      c.done()
      expect(c.send({ type: 'lost', score: 0, bestRun: 0 }).save).toEqual([{ op: 'endRun', screen: 'doors', score: 0 }])
    })
  })
})

describe('the pass policy: an empty visit', () => {
  it('a visit that had no round is no checkpoint: the next screen comes without one', () => {
    const p = pass({ lastEnded: 'broom' })
    const r = p.send({ type: 'screen-done', facts: facts(), score: 0, empty: true })
    expect(r.fresh).toBe(true)
    expect(p.state).toMatchObject({ screen: 'ladder', checkpointDue: false })
    // a visit with rounds still has one
    p.done()
    expect(p.state).toMatchObject({ screen: 'ghosts', checkpointDue: true })
  })
})
