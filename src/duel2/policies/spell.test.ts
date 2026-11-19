import { describe, expect, it } from 'vitest'
import type { LetterDef, Pt } from '../data/strokes'
import { SPELL_BOARD } from '../logic/drawLayout'
import { DRAW_TRIES, type TrackRequest } from './draw'
import { SPELL_HINT_MS, SPELL_IDLE_MS, WRONG_MS, spellVisit, spellWriting, stepSpell, type SpellBox, type SpellInput, type SpellRound, type SpellState, type SpellStep, type SpellWait } from './spell'

const box = (unit: string) => ({ unit, text: unit, soundId: `s-${unit}` })
const ROUND: SpellRound = {
  word: 'cat', wordVoice: 'w-cat', boxes: [box('c'), box('a'), box('t')], tiles: ['c', 'a', 't', 'm', 'k'].map(box), mode: 'tiles',
  picture: 'cat.png', near: { k: 'c' },
}

type NoAt<T> = T extends unknown ? Omit<T, 'at'> : never

function freeze<T>(x: T): T {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) freeze(v) }
  return x
}

/** plays a visit as the run does: `settle` ends each wait it asked for until it waits for his drop or the round ends */
function visit(demo = false, round = ROUND) {
  let st: SpellState = spellVisit({ round, demo, at: 0 })
  let clock = 0
  let wait: SpellWait | undefined
  const d = { runs: [] as unknown[], hushes: 0, said: [] as string[], sfx: [] as string[], track: [] as { e: string; data: Record<string, unknown> }[], save: [] as SpellStep['save'], end: false }
  const send = (e: NoAt<SpellInput>) => {
    const r = stepSpell(freeze(st), { ...e, at: clock } as SpellInput)
    st = r.state
    if (r.run) d.runs.push(r.run)
    if (r.hush) d.hushes++
    d.said.push(...r.say.map((l) => ('id' in l ? l.id : `${l.line}-${l.take}`)))
    d.sfx.push(...r.sfx)
    d.track.push(...r.track)
    d.save.push(...r.save)
    if (r.wait) wait = r.wait
    if (r.end) d.end = true
    return r
  }
  const settle = () => {
    for (let i = 0; i < 50 && wait && wait.for !== 'drop' && !d.end; i++) {
      const w = wait
      wait = undefined
      clock += w.for === 'sleep' ? w.ms : 0
      send({ type: w.for === 'sleep' ? 'slept' : 'heard' })
    }
  }
  const self = {
    d, send, settle,
    get view() { return st.view },
    open() { send({ type: 'start' }); settle(); return self },
    pass(ms: number) { clock += ms },
    get wait() { return wait },
    drop(tile: string, b: number) { const r = send({ type: 'drop', tile, box: b }); settle(); return r },
    tracked: (e: string) => d.track.filter((x) => x.e === e).map((x) => x.data),
  }
  return self
}

describe('the spell policy', () => {
  it('each right drop says its unit', () => {
    const g = visit().open()
    expect(g.d.said).toEqual(['w-cat'])
    const r = g.drop('c', 0)
    expect(r.say).toEqual([{ id: 's-c' }])
    expect(r.sfx).toEqual(['drop'])
    expect(g.view.filled).toEqual(['c', null, null])
    g.drop('a', 1)
    expect(g.d.said).toEqual(['w-cat', 's-c', 's-a'])
    expect(g.tracked('spell-drop')).toEqual([
      { word: 'cat', mode: 'tiles', unit: 'c', box: 0, ok: true }, { word: 'cat', mode: 'tiles', unit: 'a', box: 1, ok: true },
    ])
  })

  it('the last drop casts: the word, the spell effect', () => {
    const g = visit().open()
    g.drop('c', 0); g.drop('a', 1)
    g.pass(5000)
    const r = g.drop('t', 2)
    expect(r.say).toEqual([{ id: 's-t' }, { id: 'w-cat' }])
    expect(r.sfx).toEqual(['drop', 'spell'])
    expect(g.view.alive).toBe(true)
    // the tiles rest while the spell is cast
    expect(r.run).toEqual({ phase: 'feedback' })
    expect(g.tracked('spell-cast')).toEqual([{ word: 'cat', mode: 'tiles', ms: 5000, mistakes: 0 }])
    expect(g.d.save).toEqual([{ op: 'recordAnswer', features: ['spell:cat', 'sc:spell-tiles'], miss: false }])
    expect(g.d.end).toBe(true)
  })

  it('a wrong tile is a mistake he fixes', () => {
    const g = visit().open()
    const r = g.send({ type: 'drop', tile: 'm', box: 0 })
    expect(r.sfx).toEqual(['wrong'])
    expect(r.run).toEqual({ phase: 'mistake' })
    expect(r.wait).toEqual({ for: 'sleep', ms: WRONG_MS })
    expect(g.view.wrong).toEqual({ tile: 'm', box: 0 })
    expect(g.tracked('spell-drop')).toEqual([{ word: 'cat', mode: 'tiles', unit: 'c', box: 0, ok: false, tile: 'm' }])
    // the tile goes back; the right tile glows and says its sound, at once
    const back = g.send({ type: 'slept' })
    expect(g.view.wrong).toBeUndefined()
    expect(g.view.glow).toBe('c')
    expect(back.say).toEqual([{ id: 's-c' }])
    expect(back.run).toEqual({ fixing: true })
    // only the right tile is taken; no hint comes by itself; the sound plays again while he waits
    expect(back.wait).toEqual({ for: 'drop', idle: SPELL_IDLE_MS, every: true })
    expect(SPELL_HINT_MS).toBe(16000)
    expect(g.send({ type: 'drop', tile: 'm', box: 0 }).sfx).toEqual([])
    expect(g.send({ type: 'hint', auto: true }).track).toEqual([])
    g.pass(SPELL_IDLE_MS)
    expect(g.send({ type: 'idle' }).say).toEqual([{ id: 's-c' }])
    g.pass(SPELL_IDLE_MS)
    g.send({ type: 'idle' })
    const ok = g.send({ type: 'drop', tile: 'c', box: 0 })
    expect(ok.run).toEqual({ fixing: false, phase: 'answer' })
    expect(g.tracked('fix')).toEqual([{ screen: 'spell', target: 's-c', ms: 2 * SPELL_IDLE_MS, replays: 2 }])
    g.send({ type: 'heard' })
    g.drop('a', 1); g.drop('t', 2)
    expect(g.d.save[0]).toMatchObject({ miss: true })
    expect(g.tracked('spell-cast')[0]).toMatchObject({ mistakes: 1 })
    expect(g.d.end).toBe(true)
  })

  it('a near tile is forgiven once, the second time it is a mistake', () => {
    const g = visit().open()
    const r = g.send({ type: 'drop', tile: 'k', box: 0 })
    expect(r.say).toEqual([{ line: 'spell-near' }])
    expect(r.sfx).toEqual([])
    expect(g.view.glow).toBe('c')
    expect(g.tracked('spell-near')).toEqual([{ word: 'cat', mode: 'tiles', tile: 'k', unit: 'c', box: 0 }])
    const early = g.send({ type: 'drop', tile: 'c', box: 0 })
    expect(early.hush).toBe(true)
    expect(g.view.filled).toEqual(['c', null, null])
    const g2 = visit().open()
    g2.send({ type: 'drop', tile: 'k', box: 0 })
    g2.send({ type: 'heard' })
    const again = g2.send({ type: 'drop', tile: 'k', box: 0 })
    expect(again.sfx).toEqual(['wrong'])
    expect(g2.tracked('spell-near')).toHaveLength(1)
    expect(g2.tracked('spell-drop')).toEqual([expect.objectContaining({ ok: false, tile: 'k' })])
  })

  it('a drop into a box that is not the next one is refused', () => {
    const g = visit().open()
    const r = g.send({ type: 'drop', tile: 'a', box: 1 })
    expect([r.say, r.sfx, r.track]).toEqual([[], [], []])
    expect(g.view.filled).toEqual([null, null, null])
    g.drop('c', 0)
    const again = g.send({ type: 'drop', tile: 'c', box: 0 })
    expect(again.sfx).toEqual([])
    expect(g.view.filled).toEqual(['c', null, null])
  })

  it('the demo plays demo-spell once', () => {
    const g = visit(true).open()
    expect(g.d.said).toEqual(['w-cat', 'demo-spell-1'])
    expect(g.d.save).toEqual([{ op: 'markDemo', id: 'demo-spell' }])
    expect(g.tracked('demo')).toEqual([{ demo: 'demo-spell' }])
    expect(g.view.demo).toBe(false)
    const again = g.send({ type: 'heard' })
    expect([again.say, again.save, again.track]).toEqual([[], [], []])
    const plain = visit(false).open()
    expect(plain.d.said).toEqual(['w-cat'])
    expect(plain.d.save).toEqual([])
  })

  it('a hint glows the next tile; idle says the question line, then the word again', () => {
    const g = visit().open()
    g.drop('c', 0)
    g.send({ type: 'hint', auto: true })
    expect(g.view.glow).toBe('a')
    expect(g.tracked('hint')).toEqual([{ screen: 'spell', target: 'cat', auto: true }])
    g.send({ type: 'touch' })
    expect(g.view.glow).toBeUndefined()
    expect(g.send({ type: 'idle' }).say).toEqual([{ line: 'q-spell' }, { id: 'w-cat' }])
    expect(g.d.said.slice(-1)).toEqual(['w-cat'])
  })
})

describe('the spell policy: each box is an answer on its unit', () => {
  /** the round whose boxes carry the choice their answers count on */
  const COUNTED: SpellRound = {
    ...ROUND, boxes: ROUND.boxes.map((b) => ({ ...b, choice: { kind: 'unit', id: b.unit, text: b.text, soundId: b.soundId, itemId: b.unit } })),
  }

  it('each right drop answers its box, once, right', () => {
    const g = visit(false, COUNTED).open()
    expect([g.drop('c', 0).answer, g.drop('a', 1).answer, g.drop('t', 2).answer]).toEqual([
      { box: 0, miss: false }, { box: 1, miss: false }, { box: 2, miss: false },
    ])
  })

  it('a forgiven near tile answers its box right; the right tile after it is no second answer', () => {
    const g = visit(false, COUNTED).open()
    expect(g.send({ type: 'drop', tile: 'k', box: 0 }).answer).toEqual({ box: 0, miss: false })
    g.send({ type: 'heard' })
    expect(g.drop('c', 0).answer).toBeUndefined()
    expect(g.drop('a', 1).answer).toEqual({ box: 1, miss: false })
  })

  it('a wrong tile is a miss on its box; the fix after it is no second answer', () => {
    const g = visit(false, COUNTED).open()
    g.drop('c', 0)
    expect(g.send({ type: 'drop', tile: 'm', box: 1 }).answer).toEqual({ box: 1, miss: true })
    g.send({ type: 'slept' })
    expect(g.send({ type: 'drop', tile: 'a', box: 1 }).answer).toBeUndefined()
  })

  it('a drop while the hint\'s glow shows the tile is helped', () => {
    const g = visit(false, COUNTED).open()
    g.send({ type: 'hint', auto: false })
    expect(g.drop('c', 0).answer).toEqual({ box: 0, miss: false, helped: true })
    expect(g.drop('a', 1).answer).toEqual({ box: 1, miss: false })
  })

  it('a box with no choice is no answer of its own', () => {
    const g = visit().open()
    expect([g.drop('c', 0).answer, g.send({ type: 'drop', tile: 'm', box: 1 }).answer]).toEqual([undefined, undefined])
  })
})

describe('the spell policy: a written word (stage 4 on)', () => {
  // synthetic letters (the engine's tests never import the English strokes): s and p a stem, h an arch, i a stem and its dot
  const stem = (letter: string): LetterDef => ({ letter, script: 'print', w: 0.3, variants: [[{ pts: [[0.15, 0.35], [0.15, 1]] }]] })
  const arch: Pt[] = [[0.1, 0.4], [0.1, 1], [0.1, 0.6], [0.2, 0.45], [0.35, 0.4], [0.5, 0.45], [0.58, 0.6], [0.6, 1]]
  const DEFS: Record<string, LetterDef> = {
    s: stem('s'), p: stem('p'), h: { letter: 'h', script: 'print', w: 0.7, variants: [[{ pts: arch }]] },
    i: { letter: 'i', script: 'print', w: 0.3, variants: [[{ pts: [[0.15, 0.4], [0.15, 1]] }, { pts: [[0.15, 0.15], [0.15, 0.18]] }]] },
  }
  const WRITING = {
    strokesOf: (l: string) => DEFS[l], isMark: (l: string, i: number) => l === 'i' && i === 1,
    lines: { top: 0, mid: 0.35, base: 1, desc: 1.29, cap: 0.1 }, font: 'Andika', unitEm: 0.79, em: (t: string) => t.length * 0.5,
  }
  const unitBox = (unit: string, sound: string): SpellBox => ({ unit, text: unit, soundId: `s-${sound}`, choice: { kind: 'unit', id: unit, text: unit, soundId: `s-${sound}`, itemId: unit } })
  const SHIP: SpellRound = { word: 'ship', wordVoice: 'w-ship', boxes: [unitBox('sh', 'sh'), unitBox('i', 'ih'), unitBox('p', 'p')], tiles: [], mode: 'write' }

  /** a written visit: `write(i, pts)` draws pts in letter i's box (letter units of that box) */
  function written(demo = false) {
    const write = spellWriting(SHIP, WRITING)
    let st: SpellState = spellVisit({ round: SHIP, demo, at: 0, write })
    let wait: SpellWait | undefined
    const d = { said: [] as string[], sfx: [] as string[], track: [] as TrackRequest[], save: [] as SpellStep['save'], answers: [] as unknown[], runs: [] as unknown[], end: false }
    const send = (e: NoAt<SpellInput>) => {
      const r = stepSpell(freeze(st), { ...e, at: 0 } as SpellInput)
      st = r.state
      d.said.push(...r.say.map((l) => ('id' in l ? l.id : `${l.line}-${l.take ?? 0}`)))
      d.sfx.push(...r.sfx)
      d.track.push(...r.track)
      d.save.push(...r.save)
      if (r.answer) d.answers.push(r.answer)
      if (r.run) d.runs.push(r.run)
      if (r.wait) wait = r.wait
      if (r.end) d.end = true
      return r
    }
    const settle = () => {
      for (let i = 0; i < 50 && wait && wait.for !== 'drop' && !d.end; i++) {
        const w = wait
        wait = undefined
        send({ type: w.for === 'sleep' ? 'slept' : 'heard' })
      }
    }
    const dx = (i: number) => write.layout.boxes![i].dx
    const self = {
      d, send, settle,
      get view() { return st.view.write! },
      get spell() { return st.view },
      get wait() { return wait },
      open() { send({ type: 'start' }); settle(); return self },
      /** pts drawn in letter i's box (no wait is ended) */
      stroke: (i: number, pts: Pt[]) => send({ type: 'stroke', pts: pts.map(([x, y]): Pt => [x + dx(i), y]) }),
      write(i: number, pts: Pt[]) { const r = self.stroke(i, pts); settle(); return r },
      letter(i: number, ch: string) { return self.write(i, DEFS[ch].variants[0][0].pts) },
    }
    return self
  }

  it('a written word checks each letter in its box', () => {
    const g = written().open()
    // one box per letter (not per unit), left to right on the book's board
    expect(g.view.letters).toEqual(['s', 'h', 'i', 'p'])
    const boxes = g.view.layout.boxes!
    expect(boxes).toHaveLength(4)
    boxes.slice(1).forEach((b, i) => expect(b.left).toBeGreaterThan(boxes[i].right))
    expect(boxes[0].left).toBeGreaterThanOrEqual(SPELL_BOARD.left)
    expect(boxes[3].right).toBeLessThanOrEqual(SPELL_BOARD.right)
    expect(g.wait).toEqual({ for: 'drop', idle: SPELL_IDLE_MS, hint: SPELL_HINT_MS })
    // s in its box: the letter is right, but its unit (sh) is not done: no box filled, no answer, no sound
    const s = g.letter(0, 's')
    expect(s.sfx).toEqual(['stroke'])
    expect(g.view.at).toBe(1)
    expect(g.spell.filled).toEqual([null, null, null])
    expect(g.d.answers).toEqual([])
    // h in its own box: the unit sh is done: one answer, its sound
    const h = g.letter(1, 'h')
    expect(h.say).toEqual([{ id: 's-sh' }])
    expect(h.sfx).toEqual(['stroke', 'drop'])
    expect(g.spell.filled).toEqual(['sh', null, null])
    expect(g.d.answers).toEqual([{ box: 0, miss: false }])
    // i: the stem; its dot is owed where his i puts it
    g.letter(2, 'i')
    expect(g.view.owed).toHaveLength(1)
    expect(g.spell.filled).toEqual(['sh', 'i', null])
    // the dot after the next letter is still i's (the marks rule)
    g.letter(3, 'p')
    expect(g.view.mode).toBe('mark')
    expect(g.d.said.slice(-2)).toEqual(['s-p', 'draw-dot-1'])
    expect(g.spell.alive).toBe(false)
    const dot = g.send({ type: 'stroke', pts: g.view.owed![0] })
    expect(g.spell.alive).toBe(true)
    // (p's sound came before the dot's line: the cast says the word)
    expect(dot.say).toEqual([{ id: 'w-ship' }])
    expect(dot.sfx).toEqual(['stroke', 'spell'])
    // each unit counts once (sh, written as two letters, once)
    expect(g.d.answers).toEqual([{ box: 0, miss: false }, { box: 1, miss: false }, { box: 2, miss: false }])
    expect(g.d.save).toEqual([{ op: 'recordAnswer', features: ['spell:ship', 'sc:spell-write'], miss: false }])
    expect(g.d.track.filter((x) => x.e === 'spell-drop').map((x) => x.data.unit)).toEqual(['sh', 'i', 'p'])
  })

  it('a letter that fails is the calm mistake: the hand shows it, its sound; only right strokes count then', () => {
    const g = written().open()
    g.letter(0, 's')
    // a flat line is no h
    const wrong = g.stroke(1, [[0.1, 0.7], [0.6, 0.7]])
    expect(wrong.sfx).toEqual(['wrong'])
    expect(wrong.run).toEqual({ phase: 'mistake' })
    expect(wrong.wait).toEqual({ for: 'sleep', ms: WRONG_MS })
    expect(g.view.strokes[g.view.strokes.length - 1]?.state).toBe('wrong')
    expect(g.d.answers).toEqual([{ box: 0, miss: true }])
    // the fix: the faded stroke goes, the hand shows h, its unit's sound; no hint comes by itself
    const fix = g.send({ type: 'slept' })
    expect(fix.run).toEqual({ fixing: true })
    expect(fix.say).toEqual([{ id: 's-sh' }])
    expect(g.view.demo?.strokes).toHaveLength(1)
    expect(g.view.demo?.hint).toBeUndefined()
    expect(fix.wait).toEqual({ for: 'drop', idle: SPELL_IDLE_MS, every: true })
    expect(g.send({ type: 'hint', auto: true }).track).toEqual([])
    // he waits: the sound and the hand again
    const before = g.view.demo!.id
    expect(g.send({ type: 'idle' }).say).toEqual([{ id: 's-sh' }])
    expect(g.view.demo!.id).toBeGreaterThan(before)
    // a wrong stroke now only fades (no second mistake)
    const again = g.write(1, [[0.1, 0.7], [0.6, 0.7]])
    expect(again.sfx).toEqual([])
    expect(again.run).toBeUndefined()
    const ok = g.letter(1, 'h')
    expect(ok.run).toEqual({ fixing: false, phase: 'answer' })
    expect(g.d.track.filter((x) => x.e === 'fix')).toEqual([{ e: 'fix', data: expect.objectContaining({ screen: 'spell', target: 's-sh', replays: 1 }) }])
    // sh is answered once: its miss
    expect(g.d.answers).toEqual([{ box: 0, miss: true }])
    g.letter(2, 'i'); g.letter(3, 'p'); g.send({ type: 'stroke', pts: g.view.owed![0] })
    expect(g.d.save).toEqual([{ op: 'recordAnswer', features: ['spell:ship', 'sc:spell-write'], miss: true }])
  })

  it('after DRAW_TRIES wrong strokes in a fix, the hand draws the stroke for him', () => {
    const g = written().open()
    g.write(0, [[0, 0.5], [0.3, 0.5]])
    g.send({ type: 'slept' })
    for (let k = 0; k < DRAW_TRIES; k++) g.write(0, [[0, 0.5], [0.3, 0.5]])
    expect(g.view.at).toBe(1)
    expect(g.view.strokes.some((x) => x.state === 'helped')).toBe(true)
  })

  it('the hint shows the hand writing what is left of the letter (the drawing\'s hint); the pen takes it away; the letter counts as helped', () => {
    const g = written().open()
    const r = g.send({ type: 'hint', auto: false })
    expect(r.say).toEqual([{ id: 'w-ship' }])
    expect(g.view.demo).toMatchObject({ hint: true, strokes: [DEFS.s.variants[0][0].pts] })
    expect(g.d.track).toEqual([{ e: 'hint', data: { screen: 'spell', target: 'ship', auto: false } }])
    g.send({ type: 'touch' })
    expect(g.view.demo).toBeUndefined()
    g.letter(0, 's'); g.letter(1, 'h')
    expect(g.d.answers).toEqual([{ box: 0, miss: false, helped: true }])
    g.letter(2, 'i')
    expect(g.d.answers[g.d.answers.length - 1]).toEqual({ box: 1, miss: false })
  })

  it('the first written word plays demo-spell-write', () => {
    const g = written(true).open()
    expect(g.d.said).toEqual(['w-ship', 'demo-spell-write-1'])
    expect(g.d.save).toEqual([{ op: 'markDemo', id: 'demo-spell-write' }])
    expect(g.d.track).toEqual([{ e: 'demo', data: { demo: 'demo-spell-write' } }])
    expect(g.d.runs).toContainEqual({ phase: 'demo' })
    // the hand wrote the first letter, and went
    expect(g.view.demo).toBeUndefined()
    expect(g.d.runs[g.d.runs.length - 1]).toEqual({ phase: 'answer' })
    expect(g.wait).toMatchObject({ for: 'drop' })
    // the hand showed s's stroke, in its box
    const shown = written(true)
    shown.send({ type: 'start' })
    shown.send({ type: 'heard' })
    expect(shown.view.demo?.strokes).toEqual([DEFS.s.variants[0][0].pts])
    // a tiles round keeps its own demo
    expect(visit(true).open().d.said).toEqual(['w-cat', 'demo-spell-1'])
  })

  it('a pause starts the written word again from its first letter; the units answered before stay answered', () => {
    const write = spellWriting(SHIP, WRITING)
    const st = spellVisit({ round: SHIP, demo: false, at: 0, write, answered: [0] })
    expect(st.view.write!.at).toBe(0)
    expect(st.answered).toEqual([0])
    expect(() => spellVisit({ round: SHIP, demo: false, at: 0 })).toThrow(/written/)
  })
})
