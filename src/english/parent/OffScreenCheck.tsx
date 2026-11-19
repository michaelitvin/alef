// The parent's off-screen reading check (parent text): the words of the last run, one at a time in large print. The
// parent holds the phone out, he reads the word off the screen, and the parent taps ✓ or ✗. Optional; no child screen
// links to it.
import { useState } from 'react'
import { LATIN_TEXT } from '../../shared/latinText'
import { WORDS, type EnWord } from '../content/words'
import { useEnglishStore } from '../store'
import { englishTelemetry } from '../telemetry'

export default function OffScreenCheck() {
  const ids = useEnglishStore((s) => s.lastRunWords) as string[] | undefined
  const run = useEnglishStore((s) => s.runs) as number
  const [at, setAt] = useState(0)
  const [marks, setMarks] = useState<Record<string, boolean>>({})
  const words = (ids ?? []).map((id) => WORDS.find((w) => w.id === id)).filter((w): w is EnWord => w !== undefined)
  const w = words[at]
  const answer = (ok: boolean) => {
    if (!w) return
    englishTelemetry.track('parent-check', { word: w.id, ok, run })
    setMarks((m) => ({ ...m, [w.id]: ok }))
    setAt(at + 1)
  }
  return (
    <div data-offscreen-check>
      <h3>Off-screen reading check</h3>
      <p>
        Show him the words of his last run, one at a time, and ask him to read each aloud. Tap ✓ when he reads it, ✗ when
        he does not. Optional: the game does not need it.
      </p>
      {words.length === 0 ? <p>No words yet: play a run first.</p> : w ? (
        <div>
          <p data-check-count>{at + 1} of {words.length}</p>
          <p data-check-word style={{ fontFamily: "'Andika', system-ui, sans-serif", fontSize: 96, lineHeight: 1.1, margin: '12px 0', ...LATIN_TEXT }}>{w.text}</p>
          <button type="button" data-check-ok style={{ fontSize: 32, marginRight: 16 }} onClick={() => answer(true)} aria-label="He read it">✓</button>
          <button type="button" data-check-no style={{ fontSize: 32 }} onClick={() => answer(false)} aria-label="He did not read it">✗</button>
        </div>
      ) : (
        <div>
          <p data-check-done>Done: {Object.values(marks).filter(Boolean).length} of {words.length} read.</p>
          <button type="button" data-check-again onClick={() => { setAt(0); setMarks({}) }}>Check again</button>
        </div>
      )}
    </div>
  )
}
