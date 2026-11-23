// The start-stage list offers only the stages that are ready (M1); the stage he is at stays listed.
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../readyStages', async (orig) => ({ ...(await orig<typeof import('../readyStages')>()), READY_STAGES: [1, 2, 3] }))
import Level from './Level'
import { useEnglishStore } from '../store'

describe('the start-stage list', () => {
  beforeEach(() => { localStorage.clear(); useEnglishStore.getState().resetProgress() })

  const options = (c: HTMLElement) => [...c.querySelectorAll('[data-start-stage] option')].map((o) => Number(o.getAttribute('value')))

  it('lists the ready stages only', () => {
    const { container } = render(<Level />)
    expect(options(container)).toEqual([1, 2, 3])
  })

  it('keeps the stage he is at in the list, ready or not', () => {
    useEnglishStore.setState({ stage: { stage: 6, newAnswers: '' } })
    const { container } = render(<Level />)
    expect(options(container)).toEqual([1, 2, 3, 6])
  })
})
