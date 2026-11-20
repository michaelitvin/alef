// The English section's words: each word he has met, read alone and read after the hint blended it, and the nonsense words
// apart. A word's counts are the tower's (its own id) and every other screen's (`w:<word>`) added together: they are
// separate records of separate answers.
import type { Tally } from '../../shared/adaptive'
import { WORDS, type EnWord } from '../content/words'
import { useEnglishStore } from '../store'
import { rightOf } from './Units'

const add = (a?: number, b?: number) => (a ?? 0) + (b ?? 0)
function sum(a: Tally | undefined, b: Tally | undefined): Tally | undefined {
  if (!a || !b) return a ?? b
  return { seen: add(a.seen, b.seen), wrong: add(a.wrong, b.wrong), timeout: add(a.timeout, b.timeout), helped: add(a.helped, b.helped) }
}

function Table({ title, words, tally }: { title: string; words: EnWord[]; tally: (w: EnWord) => Tally | undefined }) {
  const rows = words.map((w) => ({ w, t: tally(w) })).filter((r) => (r.t?.seen ?? 0) > 0)
  return (
    <div data-words-table={title}>
      <h4>{title}</h4>
      {rows.length === 0 ? <p>None yet.</p> : (
        <table>
          <thead><tr><th>Word</th><th>Stage</th><th>Alone</th><th>With the hint</th><th>Wrong</th></tr></thead>
          <tbody>
            {rows.map(({ w, t }) => (
              <tr key={w.id} data-word={w.id}>
                <td>{w.text}</td><td>{w.stage}</td><td data-n="right">{rightOf(t)}</td><td data-n="helped">{t?.helped ?? 0}</td><td data-n="wrong">{t?.wrong ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function Words() {
  const byMark = useEnglishStore((s) => s.tower?.byMark)
  const tallies = useEnglishStore((s) => s.tallies)
  const tally = (w: EnWord): Tally | undefined => sum(byMark?.[w.id], tallies[`w:${w.id}`])
  const real = WORDS.filter((w) => w.kind !== 'nonsense')
  return (
    <div data-english-words>
      <h3>Words</h3>
      <p>“Alone” counts the answers he gave without the hint; “with the hint” the ones after it blended the word.</p>
      <Table title="Words" words={real} tally={tally} />
      <Table title="Nonsense words" words={WORDS.filter((w) => w.kind === 'nonsense')} tally={tally} />
    </div>
  )
}
