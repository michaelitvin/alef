import { describe, expect, it } from 'vitest'
import { SPELL_HINT_MS, SPELL_IDLE_MS, WRONG_MS, spellVisit, stepSpell, type SpellInput, type SpellRound, type SpellState, type SpellStep, type SpellWait } from './spell'

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
    expect(r.say).toEqual([{ id: 'spell-near' }])
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

  it('a hint glows the next tile; idle says the word again', () => {
    const g = visit().open()
    g.drop('c', 0)
    g.send({ type: 'hint', auto: true })
    expect(g.view.glow).toBe('a')
    expect(g.tracked('hint')).toEqual([{ screen: 'spell', target: 'cat', auto: true }])
    g.send({ type: 'touch' })
    expect(g.view.glow).toBeUndefined()
    g.send({ type: 'idle' })
    expect(g.d.said.slice(-1)).toEqual(['w-cat'])
  })
})
