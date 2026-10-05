// Verify-mode only (#/duel/glyphs): every rune in every pad state, every picture word, every monster as it
// walks (mirroring applied) and every icon — screenshotted by the headless verification for a visual check.
import { DUEL_MARKS } from '../../utils/duel/marks'
import { PICTURE_WORDS } from '../../utils/duel/words'
import { MONSTERS, WORD_PICTURE } from '../../assets/duel/sprites'
import { RuneGlowDefs, RuneGlyph } from '../../components/duel/RuneGlyph'
import { Icon, type IconName } from '../../components/duel/Icon'
import { MonsterImg } from '../../components/duel/Explosion'
import '../../components/duel/duel.css'

const STATES = ['', 'hit', 'miss', 'reveal', 'almost']
const ICONS: IconName[] = ['heart', 'heartEmpty', 'sparkle', 'pause', 'play', 'replay', 'eye', 'ear', 'shield', 'flame', 'bolt', 'swords',
  'speaker', 'speakerOff', 'talk', 'puff', 'trophy', 'music', 'musicOff', 'chart', 'bonk', 'wand', 'bossHeart']

export default function DuelGlyphSheet() {
  return (
    <div className="nd-root nd-glyphs" dir="rtl" style={{ overflow: 'auto', display: 'block', padding: 12 }}>
      <RuneGlowDefs />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STATES.length}, 72px)`, gap: 6 }}>
        {DUEL_MARKS.flatMap((m) =>
          STATES.map((st) => (
            <div key={m.id + st} className={`nd-rune ${st}`} style={{ height: 64 }}>
              <RuneGlyph mark={m} size={52} />
            </div>
          )),
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {PICTURE_WORDS.map((w) => (
          <div key={w.key} className="nd-rune" style={{ width: 84, height: 72 }}>
            <img className="nd-word-pic nd-word-btn" src={WORD_PICTURE[w.key]} alt="" />
          </div>
        ))}
      </div>
      <div className="nd-glyph-walk" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, background: 'linear-gradient(#241154, #160a35)', padding: 8 }}>
        {Object.keys(MONSTERS).map((id) => (
          <div key={id} style={{ position: 'relative' }}>
            <MonsterImg id={id} />
            <div style={{ position: 'absolute', bottom: -4, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, transparent, #ffd34d)' }} title="walking direction: toward the left" />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        {ICONS.map((n) => (
          <div key={n} style={{ background: '#3c2a7a', borderRadius: 8, padding: 6 }}>
            <Icon name={n} size={36} />
          </div>
        ))}
      </div>
    </div>
  )
}
