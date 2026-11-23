// @vitest-environment jsdom

// The words a run read are given to the course's `onRunEnd` once, however the run ends (the English parent's check shows them).
import { describe, expect, it, vi } from 'vitest'
import { RunController } from './controller'
import { HEBREW } from './course/hebrew'
import type { Course } from './course/types'
import type { Choice } from './logic/rounds'
import { memorySavePort } from './savePort'

const word = (id: string): Choice => ({ kind: 'word', id, text: id, soundId: `w-${id}`, itemId: id })
type Priv = {
  record: (screen: string, t: Choice, tapped: Choice | null, r: 'right' | 'wrong') => void
  endRun: () => Promise<unknown>
  endSession: (r: unknown) => void
}
const make = (o: { sandbox?: boolean; hook?: boolean } = {}) => {
  const onRunEnd = vi.fn()
  const course: Course = { ...HEBREW, rounds: { ...HEBREW.rounds, features: () => [] }, ...(o.hook === false ? {} : { onRunEnd }) }
  const c = new RunController({ course, save: memorySavePort({}), ...(o.sandbox ? { sandbox: true } : {}) })
  const p = c as unknown as Priv
  const read = (...ids: string[]) => ids.forEach((id) => p.record('broom', word(id), word(id), 'right'))
  return { c, p, onRunEnd, read }
}

describe('the run gives its words to the course', () => {
  it('in order, without repeats', () => {
    const { c, read, onRunEnd } = make()
    read('cat', 'map', 'cat', 'ship')
    c.exit()
    expect(onRunEnd).toHaveBeenCalledWith(['cat', 'map', 'ship'])
  })
  it('when the run is lost', async () => {
    const { p, read, onRunEnd } = make()
    read('cat')
    await p.endRun().catch(() => {})
    expect(onRunEnd).toHaveBeenCalledTimes(1)
  })
  it('when he holds the home button, and once when the run is then destroyed', () => {
    const { c, read, onRunEnd } = make()
    read('cat')
    c.exit()
    c.destroy()
    expect(onRunEnd).toHaveBeenCalledTimes(1)
  })
  it('when the app closes', () => {
    const { c, read, onRunEnd } = make()
    read('cat')
    c.destroy()
    c.destroy()
    expect(onRunEnd).toHaveBeenCalledTimes(1)
  })
  it('when a session ends', () => {
    const { p, read, onRunEnd } = make()
    read('cat')
    try { p.endSession({ over: { crystals: 0, best: false } }) } catch { /* the view is not under test */ }
    expect(onRunEnd).toHaveBeenCalledTimes(1)
  })
  it('not with no words read', () => {
    const { c, onRunEnd } = make()
    c.exit()
    expect(onRunEnd).not.toHaveBeenCalled()
  })
  it('not in a sandbox run', () => {
    const { c, read, onRunEnd } = make({ sandbox: true })
    read('cat')
    c.exit()
    expect(onRunEnd).not.toHaveBeenCalled()
  })
  it('a course without the hook (Hebrew) ends normally', () => {
    const { c, read } = make({ hook: false })
    read('cat')
    expect(() => { c.exit(); c.destroy() }).not.toThrow()
  })
})
