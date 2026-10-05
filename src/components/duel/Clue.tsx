// The monster's clue, by screen type: A picture sign (tap = hear the word), B sound / C name (tap = replay),
// B shva = the mute monster, D the rune on its shield. No text: icons and pictures only.
import type { Round } from '../../types/duel'
import { WORD_PICTURE } from '../../assets/duel/sprites'
import { Icon } from './Icon'
import { RuneGlyph } from './RuneGlyph'

export function Clue({ round, onReplay }: { round: Round; onReplay: () => void }) {
  if (round.type === 'A')
    return (
      <button className="nd-clue nd-clue-sign" onClick={onReplay} aria-label="hear the word">
        <img className="nd-word-pic" src={WORD_PICTURE[round.word.key]} alt="" draggable={false} />
      </button>
    )
  if (round.type === 'D')
    return (
      <div className="nd-clue nd-clue-shield">
        <RuneGlyph mark={round.target} box size={54} />
      </div>
    )
  if (round.type === 'B' && round.target.group === 'silent')
    return (
      <div className="nd-clue">
        <Icon name="speakerOff" size={34} />
        <Icon name="puff" size={34} />
      </div>
    )
  return (
    <button className="nd-clue nd-clue-audio" onClick={onReplay} aria-label="hear again">
      <Icon name={round.type === 'B' ? 'speaker' : 'talk'} size={34} />
    </button>
  )
}
