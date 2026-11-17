import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { memoryLog } from './log.ts'
import type { Choices, RoundTakes, Versioned } from './legacy.ts'
import { exportChoices, exportQueue, exportVersioned, importChoices, importVersioned, snapshotOrder } from './legacy.ts'
import { deriveItem } from './rules.ts'

const replay = (events: ReturnType<typeof importChoices>) => {
  const log = memoryLog()
  log.append(events)
  return log.read()
}

describe('choices store', () => {
  const s1: Choices = {
    x: { ok: [], rejected: [{ file: 'x/v1', note: 'tee-tee', at: '2026-11-17 13:30:41' }] },
    y: { ok: ['y/v1'], rejected: [] },
    p: { ok: [], rejected: [], note: { text: 'could be a skillet', at: '2026-11-17 13:13:30' } },
  }
  const s2: Choices = {
    // x: he changed his mind (OK) and the old note is gone from the live file
    x: { ok: ['x/v1'], rejected: [] },
    // y: reset, then rejected with a new note
    y: { ok: [], rejected: [{ file: 'y/v1', note: 'flat', at: '2026-11-18 09:00:00' }] },
    p: { ok: [], rejected: [], note: { text: 'skillet', at: '2026-11-18 09:01:00' }, name: { say: 'pot', at: '2026-11-18 09:02:00' } },
  }

  it('round-trips the live file through every backup', () => {
    const events = replay(importChoices([{ name: 'b1', data: s1 }, { name: 'live', data: s2 }], { name: 'q', data: ['x', 'y'] }))
    expect(exportChoices(events)).toEqual(s2)
    expect(exportQueue(events)).toEqual(['x', 'y'])
  })

  it('keeps the notes the live file lost, as history', () => {
    const events = replay(importChoices([{ name: 'b1', data: s1 }, { name: 'live', data: s2 }]))
    const x = deriveItem({ id: 'x', kind: 'audio', takes: [{ id: 'x/v1' }] }, events)
    expect(x.notes).toMatchObject([{ text: 'tee-tee', state: 'closed', closedBy: 'changed-mind' }])
    const p = deriveItem({ id: 'p', kind: 'image', takes: [{ id: 'p/a' }] }, events)
    expect(p.notes.map((n) => n.text)).toEqual(['could be a skillet', 'skillet', 'pot'])
    expect(events.every((e) => e.by === 'parent' && e.src)).toBe(true)
  })

  it('an edited note becomes a new reject event with the new text', () => {
    const s3: Choices = { y: { ok: [], rejected: [{ file: 'y/v1', note: 'flat, too slow', at: '2026-11-18 10:00:00' }] } }
    const events = replay(importChoices([{ name: 'a', data: { y: s2.y } }, { name: 'b', data: s3 }]))
    expect(exportChoices(events)).toEqual(s3)
    expect(events.filter((e) => e.type === 'reject').map((e) => e.text)).toEqual(['flat', 'flat, too slow'])
  })

  it('orders backups by their time stamp and puts the live file last', () => {
    expect(snapshotOrder(['c.json', 'c.backup-20261107-1.json', 'c.backup-20261015-024149.json', 'c.backup-20261117-135802-before.json'], 'c.json')).toEqual([
      'c.backup-20261015-024149.json',
      'c.backup-20261107-1.json',
      'c.backup-20261117-135802-before.json',
      'c.json',
    ])
  })
})

describe('versioned store (the first nikkud duel)', () => {
  const rounds: RoundTakes = { w: { version: 5, takes: ['w/v4-0.mp3', 'w/v5-0.mp3', 'w/v5-1.mp3'] } }
  const b1: Versioned = {
    w: { pick: 1, status: 'picked', note: 'the tzeire sounds odd', version: 2, at: '2026-10-04 23:35:32' },
    m: { pick: 1, status: 'picked', note: 'Just one voice?', version: 1, at: '2026-10-04 09:29:03' },
  }
  const live: Versioned = {
    w: { pick: 0, status: 'picked', note: '', version: 5, at: '2026-10-07 09:00:17' },
    m: { pick: null, status: 'rejected', note: 'very awkward', version: 1, at: '2026-10-05 23:37:34' },
    set: { pick: null, status: 'picked', note: '', version: 2, at: '2026-10-06 23:30:12' },
  }

  it('round-trips, and maps a pick to the take file of the manifest round', () => {
    const events = replay(importVersioned([{ name: 'b1', data: b1 }, { name: 'live', data: live }], rounds))
    expect(exportVersioned(events, rounds)).toEqual(live)
    expect(events.find((e) => e.item === 'w' && e.round === 5)?.take).toBe('w/v4-0.mp3')
    expect(events.find((e) => e.item === 'w' && e.round === 2)?.take).toBe('v2#1')
  })

  it('keeps the overwritten notes as history', () => {
    const events = replay(importVersioned([{ name: 'b1', data: b1 }, { name: 'live', data: live }], rounds))
    expect(events.filter((e) => e.item === 'm' && e.text).map((e) => e.text)).toEqual(['Just one voice?', 'very awkward'])
  })
})

// Round trip on copies of the real files. Host-local: point REVIEW_LEGACY_DIR at a folder with one sub-folder per game,
// each holding choices.json (+ backups, retake-queue.json), or versioned.json + rounds.json (+ versioned backups).
const DIR = process.env.REVIEW_LEGACY_DIR
describe.skipIf(!DIR)('real review files (REVIEW_LEGACY_DIR)', () => {
  const games = DIR && existsSync(DIR) ? readdirSync(DIR) : []
  const read = <T,>(p: string) => JSON.parse(readFileSync(p, 'utf8')) as T
  for (const g of games) {
    const d = join(DIR!, g)
    it(`${g}: export(import(files)) equals the live files`, () => {
      const files = readdirSync(d)
      if (files.includes('rounds.json')) {
        const names = snapshotOrder(files.filter((f) => f.startsWith('versioned')), 'versioned.json')
        const rounds = read<RoundTakes>(join(d, 'rounds.json'))
        const events = replay(importVersioned(names.map((n) => ({ name: n, data: read<Versioned>(join(d, n)) })), rounds))
        expect(exportVersioned(events, rounds)).toEqual(read(join(d, 'versioned.json')))
        return
      }
      const names = snapshotOrder(files.filter((f) => f.startsWith('choices')), 'choices.json')
      const q = files.includes('retake-queue.json') ? { name: 'retake-queue.json', data: read<string[]>(join(d, 'retake-queue.json')) } : undefined
      const events = replay(importChoices(names.map((n) => ({ name: n, data: read<Choices>(join(d, n)) })), q))
      expect(exportChoices(events)).toEqual(read(join(d, 'choices.json')))
      if (q) expect(exportQueue(events)).toEqual(q.data)
    })
  }
})
