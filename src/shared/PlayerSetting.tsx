// The parent's boy/girl control (spec 2026-11-07 girls). One setting for all the games: a change here changes every game.
// "Ask" clears it, so the next game start shows the question to the child.
import { clearGender, getPlayer, setGender, useGender, type Gender } from './player'

export function PlayerSetting({ onChange }: { onChange?: (g: Gender | null) => void }) {
  const gender = useGender()
  const by = getPlayer()?.by
  const set = (v: Gender | 'ask') => {
    if (v === 'ask') clearGender()
    else setGender(v, 'parent')
    onChange?.(v === 'ask' ? null : v)
  }
  const opt = (v: Gender | 'ask', label: string) => (
    <label style={{ marginInlineEnd: 16 }}>
      <input type="radio" name="alef-player" value={v} checked={(gender ?? 'ask') === v} onChange={() => set(v)} /> {label}
    </label>
  )
  return (
    <div data-player-setting>
      <p style={{ margin: '4px 0' }}>
        Boy or girl: the voice speaks to the child in the masculine or the feminine, and the wizard is a boy or a girl.
        Shared by all the games on this device.{gender && by ? ` (Chosen by the ${by}.)` : ''}
      </p>
      {opt('boy', 'Boy')}{opt('girl', 'Girl')}{opt('ask', 'Not set (the game asks the child)')}
    </div>
  )
}
