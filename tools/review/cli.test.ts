// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { run } from './cli.ts'
import { memoryLog } from './log.ts'
import type { GameAdapter, ReviewEvent } from './model.ts'
import type { Note } from './rules.ts'

const dir = mkdtempSync(join(tmpdir(), 'review-cli-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))
const file = (name: string, data: unknown) => {
  const p = join(dir, name)
  writeFileSync(p, JSON.stringify(data))
  return p
}

const adapter: GameAdapter = {
  id: 'g',
  title: 'g',
  log: 'unused',
  media: {},
  loadItems: () => [
    { id: 'pic-duck', kind: 'image', takes: [{ id: 'cut/duck.webp' }, { id: 'cut2/duck-t1.webp' }] },
    { id: 'pic-map', kind: 'image', accepted: 'your message: pictures with no note are OK', takes: [{ id: 'cut/map.webp' }] },
    { id: 'ph-2-15', kind: 'audio', takes: [{ id: 'v1.mp3' }, { id: 'v2.mp3' }] },
  ],
}

describe('agent CLI', () => {
  const log = memoryLog()
  const choices = file('choices.json', {
    'pic-duck': { ok: [], rejected: [], note: { text: 'could be a chick', at: '2026-11-17 13:17:05' } },
    'ph-2-15': { ok: ['v1.mp3'], rejected: [] },
  })
  const focus = file('focus.json', { items: { 'pic-duck': 'Redrawn after your note: pick the better take.', gone: 'x' } })

  it('imports the old files into an empty log, with relayed approvals and asks as agent events', async () => {
    expect(await run(adapter, log, ['import-choices', choices, '--accepted', '--focus', focus])).toEqual({ parentEvents: 2, agentEvents: 2 })
    expect(log.read().map((e) => [e.by, e.type, e.item])).toEqual([
      ['parent', 'note', 'pic-duck'],
      ['parent', 'ok', 'ph-2-15'],
      ['agent', 'accept', 'pic-map'],
      ['agent', 'ask', 'pic-duck'],
    ])
    await expect(run(adapter, log, ['import-choices', choices])).rejects.toThrow(/not empty/)
  })

  it('lists the open notes and the retake work list, and the take to ship', async () => {
    const notes = (await run(adapter, log, ['notes'])) as Note[]
    expect(notes.map((n) => [n.item, n.text])).toEqual([['pic-duck', 'could be a chick']])
    expect(await run(adapter, log, ['ship'])).toEqual({ 'pic-duck': 'cut2/duck-t1.webp', 'pic-map': 'cut/map.webp', 'ph-2-15': 'v1.mp3' })
    const shipped = file('synced.json', { 'ph-2-15': { take: 'v2.mp3' }, 'pic-map': 'cut/map.webp' })
    expect(await run(adapter, log, ['ship', '--compare', shipped])).toEqual([
      { item: 'pic-duck', shipped: null, rule: 'cut2/duck-t1.webp' },
      { item: 'ph-2-15', shipped: 'v2.mp3', rule: 'v1.mp3' },
    ])
  })

  it('answers a note, and writes only agent events', async () => {
    const [n] = (await run(adapter, log, ['notes'])) as Note[]
    const [a] = (await run(adapter, log, ['answer', 'pic-duck', String(n.seq), 'redrawn: 2 new takes', '--take', 'cut2/duck-t1.webp'])) as ReviewEvent[]
    expect(a).toMatchObject({ by: 'agent', type: 'answer', note: n.seq, take: 'cut2/duck-t1.webp' })
    expect(await run(adapter, log, ['retakes'])).toEqual([])
    await expect(run(adapter, log, ['answer', 'pic-duck', 'all', 'again'])).rejects.toThrow(/no open note/)
    await run(adapter, log, ['withdraw', 'ph-2-15', 'v1.mp3', 'his message: regenerate everything'])
    expect(((await run(adapter, log, ['current', 'ph-2-15'])) as { current: string }).current).toBe('v2.mp3')
    expect(log.read().filter((e) => e.seq > 4).every((e) => e.by === 'agent')).toBe(true)
  })

  it('exports the old formats for tools that still read them', async () => {
    expect(await run(adapter, log, ['export-choices'])).toEqual({
      'pic-duck': { ok: [], rejected: [], note: { text: 'could be a chick', at: '2026-11-17 13:17:05' } },
      'ph-2-15': { ok: ['v1.mp3'], rejected: [] },
    })
  })
})
