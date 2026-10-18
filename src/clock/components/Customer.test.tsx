import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FACING, benchSide, mirrorFor } from '../assets/facing'
import { IMAGES } from '../assets/images'
import { Customer } from './Customer'

describe('customer facing', () => {
  it('every customer picture is in the facing map, and idle and happy face the same side (or one is a front view)', () => {
    const ids = Object.keys(IMAGES).filter((k) => k.endsWith('-idle') && k !== 'cuckoo-idle').map((k) => k.replace('-idle', ''))
    expect(ids.sort()).toEqual(Object.keys(FACING).sort())
    for (const [id, f] of Object.entries(FACING)) if (f.idle !== 'front' && f.happy !== 'front') expect(f.idle, id).toBe(f.happy)
  })
  it('mirrors a picture only when it faces away from the bench; a front view never', () => {
    expect(mirrorFor('fox', 'idle', 'left')).toBe(false)
    expect(mirrorFor('fox', 'happy', 'right')).toBe(true)
    expect(mirrorFor('penguin', 'idle', 'right')).toBe(true)
    expect(mirrorFor('rabbit', 'happy', 'right')).toBe(true)
    expect(mirrorFor('rabbit', 'happy', 'left')).toBe(false)
    expect(mirrorFor('unknown', 'idle', 'right')).toBe(false)
  })
  it('the bench is left of the door in landscape, and up to the right of the customer in portrait', () => {
    expect(benchSide(false)).toBe('left')
    expect(benchSide(true)).toBe('right')
  })
  it('the sprite is mirrored in the DOM when it must look the other way (a front view never)', () => {
    for (const toward of ['left', 'right'] as const)
      for (const id of Object.keys(FACING)) {
        const flips = (['idle', 'happy'] as const).map((mood) => {
          const { container, unmount } = render(<Customer id={id} mood={mood} toward={toward} />)
          const img = container.querySelector('img')!
          const m = img.getAttribute('data-mirror') === '1'
          expect(img.style.transform, `${id} ${mood} ${toward}`).toBe(m ? 'scaleX(-1)' : '')
          unmount()
          return m
        })
        for (const [i, mood] of (['idle', 'happy'] as const).entries())
          expect(flips[i], `${id} ${mood} ${toward}`).toBe(FACING[id][mood] !== 'front' && FACING[id][mood] !== toward)
      }
  })
})
