import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChoiceExercise } from './ChoiceExercise'
import { SetExercise, initialPose, setterMode } from './SetExercise'
import { checkFor, planRound } from '../logic/rounds'
import { gradeSet } from '../logic/grade'
import { angleDiff } from '../logic/time'

// the exercise is set again: on a random o'clock time a planned setLong becomes setShort, and the tests that set their own
// time then failed now and then
const mk = (exercise: NonNullable<Parameters<typeof planRound>[0]['forcedExercise']>, level = 3) =>
  ({ ...planRound({ level, lang: 'en', rng: Math.random, tallies: {}, recent: {}, confusions: {}, forcedExercise: exercise }), exercise })

describe('ChoiceExercise', () => {
  for (const ex of ['find', 'what', 'digitalPick'] as const)
    it(`${ex}: three options, the right one marked in test builds, taps choose`, () => {
      const plan = mk(ex)
      const onChoose = vi.fn()
      const { container } = render(
        <ChoiceExercise plan={plan} script="small" locked={false} glowCard={null} word={null} reveal={null} onChoose={onChoose} onReplay={() => {}} box={{ w: 800, h: 600 }} />,
      )
      const opts = container.querySelectorAll('[data-option]')
      expect(opts).toHaveLength(3)
      fireEvent.pointerDown(container.querySelector('[data-correct="1"]')!)
      expect(onChoose).toHaveBeenCalledWith(plan.correctIndex)
    })
  it('ignores taps while locked', () => {
    const onChoose = vi.fn()
    const { container } = render(
      <ChoiceExercise plan={mk('what')} script="small" locked glowCard={0} word={null} reveal={null} onChoose={onChoose} onReplay={() => {}} box={{ w: 800, h: 600 }} />,
    )
    fireEvent.pointerDown(container.querySelectorAll('[data-option]')[0])
    expect(onChoose).not.toHaveBeenCalled()
  })
  it('the speaker button replays without choosing', () => {
    const onChoose = vi.fn()
    const onReplay = vi.fn()
    const { getAllByRole } = render(
      <ChoiceExercise plan={mk('what')} script="small" locked={false} glowCard={null} word={null} reveal={null} onChoose={onChoose} onReplay={onReplay} box={{ w: 800, h: 600 }} />,
    )
    fireEvent.pointerDown(getAllByRole('button', { name: 'listen' })[1])
    expect(onReplay).toHaveBeenCalledWith(1)
    expect(onChoose).not.toHaveBeenCalled()
  })
})

describe('SetExercise', () => {
  it('modes and initial poses', () => {
    expect(setterMode('setShort')).toBe('short')
    expect(setterMode('digitalSet')).toBe('both')
    const p = { ...mk('setLong', 2), time: { h: 4, m: 30 } }
    expect(initialPose(p)).toEqual({ hour: 120, minute: 0 })
  })
  it('a Set exercise never starts on its answer', () => {
    const at = (exercise: 'setLong' | 'setBoth' | 'digitalSet', h: number, m: number, linked: boolean) =>
      initialPose({ ...mk(exercise, 3), time: { h, m }, linked })
    // o'clock on the long-hand level: the long hand starts on 6, the linked short hand half way on
    expect(at('setBoth', 12, 0, true)).toEqual({ hour: 180, minute: 0 })
    expect(at('digitalSet', 12, 0, false)).toEqual({ hour: 180, minute: 0 })
    expect(at('setBoth', 3, 0, true)).toEqual({ hour: 270, minute: 0 })
    expect(at('digitalSet', 9, 0, true)).toEqual({ hour: 90, minute: 0 })
    expect(at('setBoth', 3, 15, true)).toEqual({ hour: 270, minute: 0 }) // never on the 12, under the long hand
    expect(at('setLong', 4, 30, true)).toEqual({ hour: 120, minute: 0 })
    for (const ex of ['setLong', 'setBoth', 'digitalSet'] as const)
      for (const h of [1, 6, 12])
        for (const m of [0, 15, 30, 45]) {
          if (ex === 'setLong' && m === 0) continue // never planned: rounds.ts turns it into setShort
          const pose = initialPose({ ...mk(ex, 3), time: { h, m } })
          const right = ex === 'setLong' ? pose.minute === m * 6 : pose.minute === m * 6 && Math.abs(pose.hour - ((h % 12) * 30 + m / 2)) < 1
          expect(right, `${ex} ${h}:${m}`).toBe(false)
        }
  })
  it('shows a digital card for digitalSet and a caption otherwise', () => {
    const d = render(<SetExercise plan={mk('digitalSet', 5)} script="small" locked={false} word={null} reveal={null} onSubmit={() => {}} onReplay={() => {}} onSnap={() => {}} box={{ w: 800, h: 600 }} />)
    expect(d.container.querySelector('[data-digital]')).not.toBeNull()
    const s = render(<SetExercise plan={mk('setBoth', 5)} script="small" locked={false} word={null} reveal={null} onSubmit={() => {}} onReplay={() => {}} onSnap={() => {}} box={{ w: 800, h: 600 }} />)
    expect(s.container.querySelector('[data-caption]')).not.toBeNull()
  })
})

describe('linked Set exercise: the natural gestures reach the answer', () => {
  const at = (deg: number) => {
    const r = (deg * Math.PI) / 180
    return { clientX: 100 + 80 * Math.sin(r), clientY: 100 - 80 * Math.cos(r), pointerId: 1 }
  }
  const play = (ex: 'setBoth' | 'digitalSet', h: number, m: number, how: 'tap' | 'drag') => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
    const onSubmit = vi.fn()
    const plan = { ...mk(ex, 3), time: { h, m }, linked: true }
    const { container, getByRole } = render(<SetExercise plan={plan} script="small" locked={false} word={null} reveal={null} onSubmit={onSubmit} onReplay={() => {}} onSnap={() => {}} box={{ w: 800, h: 600 }} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at((h % 12) * 30))
    fireEvent.pointerUp(face, at((h % 12) * 30))
    if (how === 'tap') {
      fireEvent.pointerDown(face, at(m * 6))
      fireEvent.pointerUp(face, at(m * 6))
    } else {
      fireEvent.pointerDown(face, at(0))
      for (let a = 15; a < m * 6; a += 15) fireEvent.pointerMove(face, at(a))
      fireEvent.pointerMove(face, at(m * 6))
      fireEvent.pointerUp(face, at(m * 6))
    }
    fireEvent.click(getByRole('button', { name: 'check' }))
    return { pose: onSubmit.mock.calls[0][0], time: { h, m } }
  }
  for (const ex of ['setBoth', 'digitalSet'] as const)
    for (const how of ['tap', 'drag'] as const)
      for (const [h, m] of [[12, 0], [3, 0], [3, 45], [9, 30], [6, 15]])
        it(`${ex} ${h}:${String(m).padStart(2, '0')} by ${how}`, () => {
          const { pose, time } = play(ex, h, m, how)
          expect(gradeSet(time, pose, checkFor('setBoth')).correct).toBe(true)
        })
  it('setLong at :30 starts off the answer and a tap on 6 is right', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
    const onSubmit = vi.fn()
    const plan = { ...mk('setLong', 2), time: { h: 4, m: 30 }, linked: true }
    const { container, getByRole } = render(<SetExercise plan={plan} script="small" locked={false} word={null} reveal={null} onSubmit={onSubmit} onReplay={() => {}} onSnap={() => {}} box={{ w: 800, h: 600 }} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(180))
    fireEvent.pointerUp(face, at(180))
    fireEvent.click(getByRole('button', { name: 'check' }))
    expect(gradeSet({ h: 4, m: 30 }, onSubmit.mock.calls[0][0], checkFor('setLong')).correct).toBe(true)
  })
})

describe('initialPose', () => {
  it('Set the short hand never starts under the long hand, nor on the answer', () => {
    for (let h = 1; h <= 12; h++) {
      const pose = initialPose({ exercise: 'setShort', time: { h, m: 0 } } as never)
      expect(angleDiff(pose.hour, pose.minute), `${h}:00`).toBeGreaterThanOrEqual(30)
      expect(angleDiff(pose.hour, (h % 12) * 30), `${h}:00`).toBeGreaterThanOrEqual(60)
    }
  })
})
