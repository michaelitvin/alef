// @vitest-environment node
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { memoryLog } from './log.ts'
import { exportLegacyQueue, importChoices, importVersioned, sameJson } from './legacy.ts'
import type { Choices, RoundTakes, Versioned } from './legacy.ts'
import { writeLegacyFiles } from './legacyFiles.ts'
import type { LegacyFiles, NewEvent } from './model.ts'

let dir = ''
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'review-legacy-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as unknown
const page = (e: Omit<NewEvent, 'by' | 'at'>): NewEvent => ({ ...e, by: 'parent', at: '2026-11-18T09:00:00.000Z' })

const live: Choices = {
  x: { ok: [], rejected: [{ file: 'x/v1', note: 'flat', at: '2026-11-17 13:30:41' }] },
  y: { ok: ['y/v1'], rejected: [] },
}

function choicesGame() {
  const files: LegacyFiles = {
    choices: join(dir, 'choices.json'),
    queue: join(dir, 'retake-queue.json'),
    frozenChoices: join(dir, 'choices.pre-kit-20261117.json'),
    frozenQueue: join(dir, 'retake-queue.pre-kit-20261117.json'),
  }
  writeFileSync(files.choices, JSON.stringify(live, null, 1))
  writeFileSync(files.queue!, JSON.stringify(['x']))
  const log = memoryLog()
  log.append(importChoices([{ name: 'choices.json', data: live }], { name: 'retake-queue.json', data: ['x'] }))
  /** Append like the server: the log before, the new events, the log after, then the files. */
  const decide = (...events: NewEvent[]) => {
    const before = log.read()
    log.append(events)
    return writeLegacyFiles(files, before, log.read())
  }
  return { files, log, decide }
}

describe('legacy files', () => {
  it('writes the choices and the queue after a decision, keeping the pre-switch files first', () => {
    const { files, decide } = choicesGame()
    const r = decide(page({ type: 'ok', item: 'x', take: 'x/v2' }))
    expect(r).toEqual({ written: [files.choices], skipped: [] })
    expect(readJson(files.choices)).toEqual({ ...live, x: { ok: ['x/v2'], rejected: live.x.rejected } })
    expect(readJson(files.frozenChoices)).toEqual(live)
    // the queue did not change: not written, and not frozen yet
    expect(existsSync(files.frozenQueue!)).toBe(false)
    decide(page({ type: 'reject', item: 'y', take: 'y/v2', text: 'too fast' }))
    expect(readJson(files.queue!)).toEqual(['x', 'y'])
    expect(readJson(files.frozenQueue!)).toEqual(['x'])
    // the frozen copy is kept once, never written again
    decide(page({ type: 'reset', item: 'y', take: null }))
    expect(readJson(files.frozenChoices)).toEqual(live)
    expect(readdirSync(dir).filter((f) => f.includes('tmp'))).toEqual([])
  })

  it('never writes over a file that differs from the log (a hand edit, a stale file)', () => {
    const { files, decide } = choicesGame()
    const edited = { ...live, z: { ok: ['z/v1'], rejected: [] } }
    writeFileSync(files.choices, JSON.stringify(edited))
    const r = decide(page({ type: 'ok', item: 'x', take: 'x/v2' }))
    expect(r.written).toEqual([])
    expect(r.skipped[0]).toMatch(/differs from the log/)
    expect(readJson(files.choices)).toEqual(edited)
    expect(existsSync(files.frozenChoices)).toBe(false)
  })

  it("leaves the files alone for events that do not change them (an agent's answer)", () => {
    const { files, decide } = choicesGame()
    const r = decide({ by: 'agent', at: null, type: 'answer', item: 'x', note: 1, text: 'retaken' })
    expect(r).toEqual({ written: [], skipped: [] })
    expect(existsSync(files.frozenChoices)).toBe(false)
  })

  it('writes the versioned format with the pick in its round', () => {
    const rounds: RoundTakes = { a: { version: 2, takes: ['a/v2-0', 'a/v2-1'] } }
    const old: Versioned = { a: { pick: 0, status: 'picked', note: '', version: 2, at: '2026-10-05 22:07:42' } }
    const files: LegacyFiles = { choices: join(dir, 'choices.json'), frozenChoices: join(dir, 'choices.pre-kit.json'), rounds: () => rounds }
    writeFileSync(files.choices, JSON.stringify(old))
    const log = memoryLog()
    log.append(importVersioned([{ name: 'choices.json', data: old }], rounds))
    const before = log.read()
    log.append([page({ type: 'ok', item: 'a', take: 'a/v2-1', round: 2 })])
    expect(writeLegacyFiles(files, before, log.read()).written).toEqual([files.choices])
    expect(readJson(files.choices)).toEqual({ a: { pick: 1, status: 'picked', note: '', version: 2, at: '2026-11-18T09:00:00.000Z' } })
  })

  it('reports an export that fails instead of throwing', () => {
    const files: LegacyFiles = { choices: join(dir, 'c.json'), frozenChoices: join(dir, 'f.json'), rounds: () => ({}) }
    const log = memoryLog()
    log.append([page({ type: 'ok', item: 'a', take: 'a/odd', round: 3 })])
    const r = writeLegacyFiles(files, [], log.read())
    expect(r.written).toEqual([])
    expect(r.skipped[0]).toMatch(/no export/)
  })
})

describe('the legacy queue', () => {
  it('adds the item of a new Reject made on the page, not of an edited note or an imported reject', () => {
    const log = memoryLog()
    log.append(importChoices([{ name: 'live', data: live }], { name: 'q', data: [] }))
    expect(exportLegacyQueue(log.read())).toEqual([])
    log.append([page({ type: 'reject', item: 'y', take: 'y/v1', text: 'flat' })])
    log.append([page({ type: 'reject', item: 'y', take: 'y/v1', text: 'flat, slow' })])
    log.append([page({ type: 'reject', item: 'x', take: 'x/v1', text: 'edited note' })])
    expect(exportLegacyQueue(log.read())).toEqual(['y'])
    log.append([page({ type: 'reset', item: 'x', take: null }), page({ type: 'reject', item: 'x', take: 'x/v1', text: 'again' })])
    expect(exportLegacyQueue(log.read())).toEqual(['y', 'x'])
  })

  it('compares as JSON: key order does not count, list order does', () => {
    expect(sameJson({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true)
    expect(sameJson({ a: [1, 2] }, { a: [2, 1] })).toBe(false)
    expect(sameJson({ a: 1 }, { a: 1, b: undefined })).toBe(false)
    expect(sameJson([], {})).toBe(false)
  })
})
