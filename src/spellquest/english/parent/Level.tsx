// The English section's level: what the placement found, running it again, and the stage he starts at. Neither action
// closes a station or lowers a rating (src/spellquest/english/station.ts): a lower stage only changes where the cycle goes on.
import { useState } from 'react'
import { READY_STAGES } from '../readyStages'
import { seedAfterPlacement } from '../logic/placement'
import { englishSavePort } from '../savePort'
import { englishStationsUpTo } from '../doorsPlayable'
import { useEnglishStore } from '../store'
import { englishTelemetry } from '../telemetry'
import { localDate } from './date'

export default function Level() {
  const placement = useEnglishStore((s) => s.placement)
  const stage = useEnglishStore((s) => s.stage?.stage ?? 1)
  const drawing = useEnglishStore((s) => s.settings.drawing)
  const [pick, setPick] = useState<number | null>(null)
  const chosen = pick ?? stage
  // only the stages that can be played (his own stays listed, so the box shows where he is)
  const stageOptions = [...new Set([...READY_STAGES, stage])].sort((a, b) => a - b)
  const done = placement.done
  const date = done ? localDate(done.at) : null
  const again = () => {
    englishSavePort().setPlacement({ ...placement, requested: true })
    englishTelemetry.track('settings', { keys: ['placement'], placement: 'again' })
  }
  const start = () => {
    const port = englishSavePort()
    port.setStage(chosen)
    port.seedTallies(seedAfterPlacement(chosen))
    port.openStations(englishStationsUpTo(chosen, drawing !== false))
    englishTelemetry.track('settings', { keys: ['stage'], stage: chosen })
    setPick(null)
  }
  return (
    <div data-english-level>
      <h3>Level</h3>
      <p data-level-found>
        {done ? `Placement found level ${done.level}, after ${done.answers} answers${date ? ` on ${date}` : ''}.` : 'He has not been placed yet.'}
      </p>
      <p>
        <button type="button" data-placement-again disabled={placement.requested} onClick={again}>Run the placement again</button>
        {placement.requested && <span data-placement-due> The next run starts with the placement.</span>}
      </p>
      <p>
        <label>
          Start stage{' '}
          <select data-start-stage value={chosen} onChange={(e) => setPick(Number(e.target.value))}>
            {stageOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>{' '}
        <button type="button" data-set-stage disabled={chosen === stage} onClick={start}>Start at stage {chosen}</button>
      </p>
      <p>He is at stage {stage}. A stage he has left keeps its open stations and ratings.</p>
    </div>
  )
}
