import { describe, expect, it } from 'vitest'
import type { Item, NewEvent, ReviewEvent } from './model.ts'
import { deriveAll, deriveItem, inView, openNotes, retakeList, shipList, withOrphans } from './rules.ts'

const item = (id: string, n: number, extra: Partial<Item> = {}): Item => ({
  id,
  kind: 'audio',
  takes: Array.from({ length: n }, (_, i) => ({ id: `${id}/v${i + 1}` })),
  ...extra,
})

/** Number the events in order. */
const log = (...es: Partial<NewEvent>[]): ReviewEvent[] =>
  es.map((e, i) => ({ by: 'parent', at: `t${i + 1}`, type: 'ok', item: 'a', ...e, seq: i + 1 }) as ReviewEvent)

const cur = (it: Item, events: ReviewEvent[]) => deriveItem(it, events).current?.id ?? null

describe('take to ship', () => {
  const a = item('a', 3)

  it('ships the newest take while nothing is decided (unreviewed takes play during the review)', () => {
    expect(cur(a, [])).toBe('a/v3')
  })

  it('ships an approved older take over a newer take he has not heard', () => {
    // the clock's 8 clips: v1 OK, v2 made later and never reviewed
    expect(cur(item('a', 2), log({ take: 'a/v1' }))).toBe('a/v1')
  })

  it('ships the newest of several approved takes', () => {
    expect(cur(a, log({ take: 'a/v1' }, { take: 'a/v2' }))).toBe('a/v2')
  })

  it('never falls back to a take older than the newest rejected take', () => {
    expect(cur(a, log({ type: 'reject', take: 'a/v3', text: 'flat' }))).toBe('a/v3')
    expect(cur(a, log({ type: 'reject', take: 'a/v2' }))).toBe('a/v3')
  })

  it('skips withdrawn takes, from the adapter or from an agent event', () => {
    const b = item('a', 3)
    b.takes[2].withdrawn = 'failed check'
    expect(cur(b, [])).toBe('a/v2')
    expect(cur(a, log({ by: 'agent', type: 'withdraw', take: 'a/v3', text: 'trilled r' }))).toBe('a/v2')
    expect(cur(a, log({ by: 'agent', type: 'withdraw', take: 'a/v3' }, { by: 'agent', type: 'restore', take: 'a/v3' }))).toBe('a/v3')
  })

  it('withdrawing the approved take lets the newest unreviewed take play', () => {
    const b = item('a', 2)
    expect(cur(b, log({ take: 'a/v1' }, { by: 'agent', type: 'withdraw', take: 'a/v1', text: 'his message: regenerate all' }))).toBe('a/v2')
  })

  it("follows an agent's preference among undecided takes, but never over an approval", () => {
    const pref = { by: 'agent' as const, type: 'prefer' as const, take: 'a/v2' }
    expect(cur(a, log(pref))).toBe('a/v2')
    expect(cur(a, log({ take: 'a/v1' }, pref))).toBe('a/v1')
  })

  it('counts an approval relayed from his message, and his own decision wins over it', () => {
    const acc = { by: 'agent' as const, type: 'accept' as const, take: 'a/v1', source: 'your message: all with no note are OK' }
    const s = deriveItem(item('a', 2), log(acc))
    expect(s.status).toBe('ok')
    expect(s.current?.id).toBe('a/v1')
    const after = deriveItem(item('a', 2), log(acc, { type: 'reject', take: 'a/v1', text: 'no' }))
    expect(after.takes[0].verdict).toBe('rejected')
    expect(after.current?.id).toBe('a/v2')
  })

  it('"pick this one" clears the other approvals', () => {
    expect(cur(a, log({ take: 'a/v3' }, { take: 'a/v1', only: true }))).toBe('a/v1')
    expect(cur(a, log({ take: 'a/v3' }, { take: 'a/v1' }))).toBe('a/v3')
  })

  it('picking a take decides the item: ok, the picked take ships, and the ask on a newer take closes', () => {
    const pic = item('a', 3, { kind: 'image', ask: 'which one?' })
    const st = deriveItem(pic, log({ take: 'a/v1', only: true }))
    expect(st.status).toBe('ok')
    expect(st.current?.id).toBe('a/v1')
    expect(st.askTake).toBeNull()
    expect(shipList(deriveAll([pic], log({ take: 'a/v1', only: true })))).toEqual({ a: 'a/v1' })
    expect(inView(st, 'focus')).toBe(false)
    expect(inView(st, 'open')).toBe(false)
  })

  it('a reject without a take rejects the whole round (the old versioned model)', () => {
    const b: Item = { id: 'a', kind: 'audio', takes: [{ id: 'x', round: 1 }, { id: 'y', round: 2 }, { id: 'z', round: 2 }] }
    const s = deriveItem(b, log({ type: 'reject', take: null, round: 2, text: 'very awkward' }))
    expect(s.takes.map((t) => t.verdict)).toEqual([null, 'rejected', 'rejected'])
    expect(s.current?.id).toBe('z')
    expect(s.status).toBe('rejected')
  })

  it('reset clears a decision, and the history keeps the note', () => {
    const s = deriveItem(a, log({ type: 'reject', take: 'a/v3', text: 'flat' }, { type: 'reset', take: 'a/v3' }))
    expect(s.status).toBe('open')
    expect(s.notes).toMatchObject([{ text: 'flat', state: 'closed', closedBy: 'changed-mind' }])
  })

  it('an item with every take withdrawn has nothing to ship', () => {
    const b = item('a', 1)
    b.takes[0].withdrawn = true
    expect(deriveItem(b, []).status).toBe('empty')
  })
})

describe('notes', () => {
  const a = item('a', 2)

  it('a reject note is open until an agent answers it, then closes on his next decision', () => {
    const base = log({ type: 'reject', take: 'a/v2', text: 'tee-tee' })
    expect(deriveItem(a, base).notes[0].state).toBe('open')
    const answered = [...base, { seq: 2, by: 'agent', at: null, type: 'answer', item: 'a', note: 1, text: 'new take 3', take: 'a/v3' } as ReviewEvent]
    expect(deriveItem(a, answered).notes[0]).toMatchObject({ state: 'answered', answer: { text: 'new take 3', take: 'a/v3' } })
    const decided = [...answered, { seq: 3, by: 'parent', at: null, type: 'ok', item: 'a', take: 'a/v1' } as ReviewEvent]
    expect(deriveItem(a, decided).notes[0]).toMatchObject({ state: 'closed', closedBy: 'decided' })
  })

  it('an item note is work too, and remembers the take on screen', () => {
    const s = deriveItem(a, log({ type: 'note', take: 'a/v2', text: 'retake, physics looks off' }))
    expect(s.itemNote).toMatchObject({ kind: 'note', take: 'a/v2', state: 'open' })
    expect(s.status).toBe('open')
    expect(retakeList([s])).toEqual([{ item: 'a', current: 'a/v2', status: 'open', notes: [s.itemNote] }])
  })

  it('editing a note closes the old one as edited; an empty note clears it', () => {
    const s = deriveItem(a, log({ type: 'note', text: 'candy' }, { type: 'note', text: 'gum? candy' }, { type: 'name', text: 'broom' }))
    expect(s.notes.map((n) => [n.text, n.state, n.closedBy])).toEqual([
      ['candy', 'closed', 'edited'],
      ['gum? candy', 'open', undefined],
      ['broom', 'open', undefined],
    ])
    expect(s.name?.text).toBe('broom')
    const cleared = deriveItem(a, log({ type: 'name', text: 'broom' }, { type: 'name', text: '' }))
    expect(cleared.name).toBeNull()
    expect(cleared.notes[0]).toMatchObject({ state: 'closed', closedBy: 'cleared' })
  })

  it('a retired item closes its notes and leaves every view', () => {
    const s = deriveItem(a, log({ type: 'note', text: 'could be a skillet' }, { by: 'agent', type: 'retire', text: 'dropped after your note' }))
    expect(s.status).toBe('retired')
    expect(s.notes[0]).toMatchObject({ state: 'closed', closedBy: 'retired' })
    expect(retakeList([s])).toEqual([])
    expect(inView(s, 'all')).toBe(false)
  })

  it('a note on an older take counts as answered by the newer take', () => {
    const s = deriveItem(a, log({ type: 'reject', take: 'a/v1', text: 'flat' }))
    expect(s.notes[0]).toMatchObject({ state: 'answered', answer: { take: 'a/v2', seq: 0 } })
    expect(retakeList([s])).toEqual([])
  })

  it('an empty reject is still a request', () => {
    expect(openNotes([deriveItem(a, log({ type: 'reject', take: 'a/v2', text: '' }))])).toHaveLength(1)
  })
})

describe('views and lists', () => {
  const items = [item('a', 1), item('b', 1, { ask: 'Is it v now?' }), item('c', 1, { sample: true }), item('d', 1)]
  items[3].takes[0].flags = ['too long']
  const states = deriveAll(items, log({ item: 'c', take: 'c/v1' }))

  it('needs you = open items with a question or a flag; sample adds the sampled ones', () => {
    const ids = (v: Parameters<typeof inView>[1]) => states.filter((s) => inView(s, v)).map((s) => s.item.id)
    expect(ids('focus')).toEqual(['b', 'd'])
    expect(ids('open')).toEqual(['a', 'b', 'd'])
    expect(ids('sample')).toEqual(['b', 'd'])
    expect(ids('all')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('an ask event replaces the adapter line; an empty ask clears it', () => {
    const s = deriveItem(items[1], log({ item: 'b', by: 'agent', type: 'ask', text: '' }))
    expect(s.ask).toBeNull()
  })

  it('ship list skips retired items', () => {
    const r = item('r', 1, { retired: 'reworded' })
    expect(shipList(deriveAll([items[0], r], []))).toEqual({ a: 'a/v1' })
  })
})

describe('an open ask surfaces its item', () => {
  const b = item('b', 4)
  const events = (...es: Partial<NewEvent>[]) =>
    log({ item: 'b', take: 'b/v1' }, { item: 'b', by: 'agent', type: 'ask', text: 'new take v4' }, ...es.map((e) => ({ item: 'b', ...e })))

  it('an OK-d take with a newer take and an ask is in needs you, on the newest take, and still ships v1', () => {
    const s = deriveItem(b, events())
    expect(s.status).toBe('ok')
    expect(s.current?.id).toBe('b/v1')
    expect(inView(s, 'focus')).toBe(true)
    expect(inView(s, 'open')).toBe(false)
    expect(s.askTake).toBe('b/v4')
  })

  it('uses the take named in the ask', () => {
    const s = deriveItem(b, log({ item: 'b', take: 'b/v1' }, { item: 'b', by: 'agent', type: 'ask', text: 'q', take: 'b/v3' }))
    expect(s.askTake).toBe('b/v3')
  })

  it('leaves needs you when he decides on the asked take, or an agent clears the ask', () => {
    const okd = deriveItem(b, events({ take: 'b/v4' }))
    expect(okd.askTake).toBeNull()
    expect(okd.current?.id).toBe('b/v4')
    expect(inView(okd, 'focus')).toBe(false)
    expect(deriveItem(b, events({ type: 'reject', take: 'b/v4', text: 'no' })).askTake).toBeNull()
    expect(deriveItem(b, events({ by: 'agent', type: 'ask', text: '' })).askTake).toBeNull()
  })

  it('a decision on another take does not close it', () => {
    expect(deriveItem(b, events({ take: 'b/v2' })).askTake).toBe('b/v4')
  })
})

describe('items that left the list', () => {
  it('get a retired stand-in, so their notes stay in the history and close', () => {
    const events = log({ item: 'pic-pan', type: 'note', text: 'could be a skillet' })
    const all = withOrphans([item('a', 1)], events)
    expect(all.map((i) => i.id)).toEqual(['a', 'pic-pan'])
    const s = deriveAll(all, events)[1]
    expect(s.status).toBe('retired')
    expect(s.notes[0]).toMatchObject({ state: 'closed', closedBy: 'retired' })
  })
})
