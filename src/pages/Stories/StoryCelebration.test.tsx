import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StoryCelebration } from './StoryView'

vi.mock('../../hooks/useAudio', () => ({
  useSoundEffects: () => ({ playCelebrate: vi.fn(async () => {}) }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  Navigate: () => null,
}))

describe('StoryCelebration', () => {
  it('shows the self-read badge when the story was read without help', () => {
    render(<StoryCelebration onBack={() => {}} selfRead />)
    expect(screen.getByText(/קָרָאתָ לְבַד/)).toBeTruthy()
  })

  it('shows no self-read badge when TTS help was used a lot', () => {
    render(<StoryCelebration onBack={() => {}} selfRead={false} />)
    expect(screen.queryByText(/קָרָאתָ לְבַד/)).toBeNull()
  })
})
