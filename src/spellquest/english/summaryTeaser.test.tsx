// The end screen's next-boss teaser on the English path: only a boss his stage has opened (the course's boss kinds),
// never the bird (sh ch th) before stage 4.
import { afterEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { CourseProvider } from '../course/CourseContext'
import { Summary } from '../screens/Summary'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { ENGLISH } from './course'
import { useEnglishStore } from './store'
import { ENGLISH_FRESH } from './saveFormat'
import type { BossKind } from '../logic/boss'

installFakeAudio()

const teaserAt = (stage: number, beaten: BossKind[]) => {
  useEnglishStore.setState({ ...ENGLISH_FRESH, stage: { stage, newAnswers: '' }, bossesBeaten: beaten } as never)
  const { container } = render(
    <CourseProvider value={ENGLISH}><Summary over={{ score: 3, crystals: 0, best: false }} onAgain={() => {}} onExit={() => {}} /></CourseProvider>,
  )
  return container.querySelector('[data-teaser]')?.getAttribute('data-trophy') ?? null
}

describe('the English end screen\'s boss teaser', () => {
  afterEach(() => { useEnglishStore.setState({ ...ENGLISH_FRESH } as never) })

  it('an English stage-3 save never teases the bird', () => {
    expect(teaserAt(3, [])).toBe('dot')
    // the open ones beaten: no teaser (Spell Quest would tease the closed bird)
    expect(teaserAt(3, ['dot', 'mimic', 'bat'])).toBeNull()
    expect(teaserAt(4, ['dot', 'mimic', 'bat'])).toBe('shin')
    expect(teaserAt(1, [])).toBeNull()
  })
})
