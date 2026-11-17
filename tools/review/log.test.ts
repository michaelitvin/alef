// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { fileLog, memoryLog, validate } from './log.ts'
import type { NewEvent } from './model.ts'

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'review-log-'))
  dirs.push(d)
  return join(d, 'events.jsonl')
}

const ev = (e: Partial<NewEvent>): NewEvent => ({ by: 'parent', at: 'now', type: 'ok', item: 'a', take: 'a/v1', ...e })

describe('file log', () => {
  it('appends numbered lines and reads them back; two writers share one sequence', () => {
    const path = tmp()
    const a = fileLog(path)
    const b = fileLog(path)
    a.append([ev({}), ev({ type: 'reject', text: 'flat' })])
    b.append([ev({ by: 'agent', type: 'ask', text: 'Is it v now?', take: undefined })])
    expect(a.read().map((e) => [e.seq, e.type])).toEqual([
      [1, 'ok'],
      [2, 'reject'],
      [3, 'ask'],
    ])
    expect(readFileSync(path, 'utf8').trim().split('\n')).toHaveLength(3)
  })

  it('reads a missing log as empty', () => {
    expect(fileLog(tmp()).read()).toEqual([])
  })

  it('memory log numbers events the same way', () => {
    const m = memoryLog()
    m.append([ev({}), ev({})])
    expect(m.append([ev({})])[0].seq).toBe(3)
  })
})

describe('who may write what', () => {
  it('the page writes only parent decisions', () => {
    expect(() => validate(ev({}), 'parent')).not.toThrow()
    expect(() => validate(ev({ by: 'parent', type: 'accept', source: 'x' }), 'parent')).toThrow(/may not/)
    expect(() => validate(ev({ by: 'parent', type: 'withdraw' }), 'parent')).toThrow(/may not/)
  })

  it('the agent CLI never writes a parent decision', () => {
    expect(() => validate(ev({ by: 'agent', type: 'ok' }), 'agent')).toThrow(/may not/)
    expect(() => validate(ev({ by: 'agent', type: 'note', text: 'x' }), 'agent')).toThrow(/may not/)
    expect(() => validate(ev({ by: 'parent', type: 'ask' }), 'agent')).toThrow(/expected agent/)
  })

  it('checks the fields each event needs', () => {
    expect(() => validate(ev({ by: 'agent', type: 'accept', source: '' }), 'agent')).toThrow(/source/)
    expect(() => validate(ev({ by: 'agent', type: 'answer' }), 'agent')).toThrow(/note seq/)
    expect(() => validate(ev({ by: 'agent', type: 'withdraw', take: null }), 'agent')).toThrow(/needs a take/)
    expect(() => validate(ev({ item: '' }), 'parent')).toThrow(/item/)
    expect(() => validate(ev({ type: 'reject', text: 'x'.repeat(1001) }), 'parent')).toThrow(/too long/)
  })
})
