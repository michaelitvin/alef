// Ships the English path's approved assets into the repo: voice clips (MP3), word pictures (WebP) and the green recolours.
// The review kit's decision log is the source of truth: only an item whose status is "ok" ships, and only the take
// the log says to ship. Nothing else is read as a decision.
//
// Run from the repo root, with the review kit's English adapter (it names the media folders and the log):
//   node scripts/english/export-assets.ts --adapter <english.mjs>            ship what is approved and not yet shipped
//   node scripts/english/export-assets.ts --adapter <english.mjs> --dry-run  only report
//   node scripts/english/export-assets.ts --adapter <english.mjs> --force    encode every file again
// It is repeatable: a file is encoded again only when its approved take (or the take's file) changed. It also writes
// the provenance (asset-sources/english/audio.json, pictures.json) and prints three lists: items that ship, approved
// items with no game id, and game ids with no approved item (or whose item is not ok yet).
//
// Needs `gst-launch-1.0` with the lame and xingmux plugins (no ffmpeg on the build host).
// Erasable TypeScript: Node runs it directly.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { loadAdapter } from '../../tools/review/cli.ts'
import { fileLog } from '../../tools/review/log.ts'
import { deriveAll, withOrphans } from '../../tools/review/rules.ts'
import type { ItemState } from '../../tools/review/rules.ts'
import { PHRASES } from '../../src/english/content/phrases.ts'
import { LOOKALIKE_LETTERS } from '../../src/english/content/sets.ts'
import { UNITS } from '../../src/english/content/units.ts'
import { heartVoice, letterName, nonsenseVoice, phraseVoice, soundVoice, wordVoice } from '../../src/english/content/voiceIds.ts'
import { WORDS } from '../../src/english/content/words.ts'
import { EN_LINES } from '../../src/english/data/lines.ts'

const VOICE_DIR = 'src/english/assets/audio/voice'
const IMG_DIR = 'src/english/assets/img'
const SOURCES = 'asset-sources/english'
/** MP3 settings: mono, constant 96 kbit/s (the clips are 24 kHz speech, kept at their own sample rate) */
const MP3_KBPS = 96
/** a review item named for a picture key that is spelled another way in the game */
const PICTURE_ALIAS: Record<string, string> = { yoyo: 'yo-yo' }
/** a review picture that is a screen sprite, not a picture word: its file in `img/` (the English screens read it by this key) */
const SPRITE_FILE: Record<string, string> = { spellbook: 's-book' }

const args = process.argv.slice(2)
const flag = (n: string) => args.includes('--' + n)
const adapterPath = args[args.indexOf('--adapter') + 1]
if (!adapterPath || adapterPath.startsWith('--')) {
  console.error('usage: node scripts/english/export-assets.ts --adapter <english adapter> [--dry-run] [--force]')
  process.exit(2)
}
const dry = flag('dry-run')
const force = flag('force')

const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex')
const readJson = <T>(p: string, fallback: T): T => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : fallback)

// ---- what the game names ----
const voiceOf = (w: { kind: string; text: string }): string =>
  w.kind === 'heart' ? heartVoice(w.text) : w.kind === 'nonsense' ? nonsenseVoice(w.text) : wordVoice(w.text)
const gameVoices = new Set<string>([
  ...UNITS.map(soundVoice),
  ...LOOKALIKE_LETTERS.flatMap((s) => s.letters.map(letterName)),
  ...WORDS.map(voiceOf),
  ...PHRASES.map((p) => phraseVoice(p.id)),
  ...EN_LINES.flatMap((l) => Array.from({ length: l.variations }, (_, i) => `${l.id}-${i + 1}`)),
])
const gamePictures = new Set<string>(WORDS.flatMap((w) => (w.picture ? [w.picture] : [])))
/** a picture word that the game already has from Spell Quest or the first duel (`wordPicture` in src/english/assets/images.ts) */
const spellQuestPictures = new Set([
  ...readdirSync('src/spellquest/assets/img').filter((f) => f.startsWith('pw-')).map((f) => f.slice(3, -5)),
  ...readdirSync('src/spellquest/tower/assets/sprites').filter((f) => f.startsWith('word-')).map((f) => f.slice(5, -5)),
])
const spellQuestHas = (key: string): boolean =>
  !['ball', 'eye', 'island', 'silent', 'rose'].includes(key) && (spellQuestPictures.has(key) || key in { lion: 1, chick: 1, pencil: 1, cake: 1, bike: 1 })

// ---- what the review kit approved ----
const adapter = await loadAdapter(adapterPath)
const items = withOrphans(await adapter.loadItems(), fileLog(adapter.log).read())
const states = deriveAll(items, fileLog(adapter.log).read())
const media = adapter.media as Record<string, string>
const mediaFile = (takeId: string): string => {
  const [dir, ...rest] = takeId.split('/')
  if (!media[dir]) throw new Error(`no media folder for take ${takeId}`)
  return join(media[dir], ...rest)
}

interface Job { id: string; gameId: string; state: ItemState; src: string; dest: string }
const voiceJobs: Job[] = []
const pictureJobs: Job[] = []
const recolourJobs: Job[] = []
const unmapped: string[] = []
const notOk: string[] = []
const seen = new Set<string>()
for (const s of states) {
  if (s.status === 'retired') continue
  const id = s.item.id
  const kind = id.startsWith('pic-') ? 'picture' : id.startsWith('rc-') ? 'recolour' : 'voice'
  const gameId = kind === 'picture' ? (PICTURE_ALIAS[id.slice(4)] ?? id.slice(4)) : kind === 'recolour' ? id.slice(3) : id
  const known =
    kind === 'picture' ? gamePictures.has(gameId) || gameId in SPRITE_FILE
    : kind === 'recolour' ? existsSync(join(IMG_DIR, gameId + '.webp'))
    : gameVoices.has(gameId)
  if (!known) { unmapped.push(id + (s.status === 'ok' ? '' : ` (${s.status})`)); continue }
  seen.add(kind + ':' + gameId)
  if (s.status !== 'ok' || !s.current) { notOk.push(`${id} (${s.status})`); continue }
  const src = mediaFile(s.current.id)
  if (!existsSync(src)) { notOk.push(`${id} (file missing)`); continue }
  if (kind === 'voice') voiceJobs.push({ id, gameId, state: s, src, dest: join(VOICE_DIR, gameId + '.mp3') })
  else if (kind === 'picture') pictureJobs.push({ id, gameId, state: s, src, dest: join(IMG_DIR, `${SPRITE_FILE[gameId] ?? `pw-${gameId}`}.webp`) })
  else recolourJobs.push({ id, gameId, state: s, src, dest: join(IMG_DIR, gameId + '.webp') })
}
const noItem = [
  ...[...gameVoices].filter((v) => !seen.has('voice:' + v)).sort(),
  ...[...gamePictures].filter((p) => !seen.has('picture:' + p) && !spellQuestHas(p)).sort().map((p) => 'picture:' + p),
]

// ---- provenance bookkeeping ----
interface AudioEntry {
  id: string; file: string; take: string; source_sha256: string; where: string; caption: string
  request: unknown; processing: string; earlier_takes: { take: string; verdict: string | null; note?: string }[] | null
}
interface PictureEntry {
  key: string; file: string; take: string; source_sha256: string; caption: string; model: string; reference: string
  aspect: string; prompt: string | null; processing: string
}
const audioJson = readJson<{ note: string; clips: AudioEntry[] }>(join(SOURCES, 'audio.json'), { note: '', clips: [] })
const pictureJson = readJson<{ note: string; pictures: PictureEntry[] }>(join(SOURCES, 'pictures.json'), { note: '', pictures: [] })
const audioBy = new Map(audioJson.clips.map((c) => [c.id, c]))
const pictureBy = new Map(pictureJson.pictures.map((p) => [p.key, p]))

const batchDir = media['voice-batch']
const spikeDir = media['voice-spike3']
const batchRequests = new Map<string, { prompt: string; voice?: string }>()
if (batchDir && existsSync(batchDir)) {
  for (const f of readdirSync(batchDir).filter((n) => /^requests.*\.json$/.test(n)).sort()) {
    for (const r of readJson<{ id: string; prompt: string; voice?: string }[]>(join(batchDir, f), [])) batchRequests.set(r.id, r)
  }
}
const spikeRequests = new Map(readJson<{ id: string; prompt: string }[]>(join(spikeDir ?? '', 'requests.json'), []).map((r) => [r.id, r]))
const VOICE_MODEL = 'gemini-3.8-flash-tts'

function voiceRequest(takeId: string): unknown {
  const stem = basename(takeId, '.wav')
  const r = takeId.startsWith('voice-batch/final/') ? batchRequests.get(stem.replace('__', '~')) : spikeRequests.get(stem)
  if (!r) return { model: VOICE_MODEL, voice: 'Puck', prompt: null, note: /cut21/.test(stem) ? 'a new take of the short-a retake round, cut to 0.21 s; its request was not kept' : 'its own request was not kept' }
  return { model: VOICE_MODEL, voice: ('voice' in r && r.voice) || 'Puck', response: 'audio', prompt: r.prompt }
}

const encode = (src: string, dest: string): void => {
  const p = spawnSync('gst-launch-1.0', ['-q', 'filesrc', `location=${src}`, '!', 'wavparse', '!', 'audioconvert', '!', 'audioresample', '!',
    'lamemp3enc', 'target=bitrate', `bitrate=${MP3_KBPS}`, 'cbr=true', 'mono=true', '!', 'xingmux', '!', 'filesink', `location=${dest}`], { encoding: 'utf8' })
  if (p.status !== 0) throw new Error(`encoding ${src} failed: ${p.stderr}`)
}

const counts = { voice: 0, picture: 0, recolour: 0, skipped: 0, recolourDiffers: [] as string[] }
if (!dry) { mkdirSync(VOICE_DIR, { recursive: true }); mkdirSync(IMG_DIR, { recursive: true }); mkdirSync(SOURCES, { recursive: true }) }

for (const j of voiceJobs) {
  const hash = sha(j.src)
  const old = audioBy.get(j.gameId)
  if (!force && old && old.take === j.state.current!.id && old.source_sha256 === hash && existsSync(j.dest)) { counts.skipped++; continue }
  counts.voice++
  if (dry) continue
  encode(j.src, j.dest)
  const item = j.state.item
  audioBy.set(j.gameId, {
    id: j.gameId, file: j.dest, take: j.state.current!.id, source_sha256: hash, where: item.where ?? '', caption: item.caption ?? '',
    request: voiceRequest(j.state.current!.id),
    processing: `Silence trimmed at both ends by the pipeline (the parent approved the trimmed take; no change of speed); then MP3, mono, ${MP3_KBPS} kbit/s`,
    earlier_takes: j.state.takes.filter((t) => t.take.id !== j.state.current!.id).map((t) => ({ take: basename(t.take.id, '.wav'), verdict: t.verdict, ...(t.text ? { note: t.text } : {}) })).sort((a, b) => a.take.localeCompare(b.take)),
  })
}

const items2 = readJson<{ slug: string; aspect?: string }[]>(join(media.cut ? join(media.cut, '..') : '', 'items.json'), [])
const aspectOf = new Map(items2.map((i) => [i.slug, i.aspect ?? '1:1']))
const promptOf = (takeId: string): string | null => {
  const root = join(media.cut ?? '', '..')
  const stem = basename(takeId, '.webp')
  const m = /^(.*)-t(\d)$/.exec(stem)
  const slug = m ? m[1] : stem
  const tries = m && Number(m[2]) >= 3 ? ['prompts3', 'prompts2', 'prompts'] : m ? ['prompts2', 'prompts'] : ['prompts']
  for (const d of tries) { const f = join(root, d, slug + '.txt'); if (existsSync(f)) return readFileSync(f, 'utf8').trim() }
  return null
}
for (const j of pictureJobs) {
  const hash = sha(j.src)
  const old = pictureBy.get(j.gameId)
  if (!force && old && old.take === j.state.current!.id && old.source_sha256 === hash && existsSync(j.dest)) { counts.skipped++; continue }
  counts.picture++
  if (dry) continue
  copyFileSync(j.src, j.dest)
  const takeId = j.state.current!.id
  pictureBy.set(j.gameId, {
    key: j.gameId, file: j.dest, take: takeId, source_sha256: hash, caption: j.state.item.caption ?? j.gameId,
    model: 'gemini-2.5-flash-image', reference: 'the style anchor sheet and a glow reference, as for every picture word',
    aspect: aspectOf.get(basename(takeId).replace(/-t\d\.webp$|\.webp$/, '')) ?? '1:1', prompt: promptOf(takeId),
    processing: 'Drawn on a flat magenta or green background, then cut out to a transparent WebP (halo removed, holes in the outline cleared); copied as approved, with no new size or quality',
  })
}

for (const j of recolourJobs) {
  if (existsSync(j.dest) && sha(j.src) === sha(j.dest)) { counts.skipped++; continue }
  counts.recolourDiffers.push(j.id)
  counts.recolour++
  if (!dry) copyFileSync(j.src, j.dest)
}

if (!dry) {
  audioJson.note = 'One entry for each file in src/english/assets/audio/voice/: the request of the chosen take (Gemini text-to-speech: model, voice, the text with its direction), the review note, and the other takes. Written by scripts/english/export-assets.ts. Text-to-speech output changes from run to run: keep the MP3; the request only gets a similar take.'
  audioJson.clips = [...audioBy.values()].sort((a, b) => a.id.localeCompare(b.id))
  pictureJson.note = 'One entry for each word picture src/english/assets/img/pw-<key>.webp: the Gemini prompt of the chosen take. Written by scripts/english/export-assets.ts.'
  pictureJson.pictures = [...pictureBy.values()].sort((a, b) => a.key.localeCompare(b.key))
  writeFileSync(join(SOURCES, 'audio.json'), JSON.stringify(audioJson, null, 1) + '\n')
  writeFileSync(join(SOURCES, 'pictures.json'), JSON.stringify(pictureJson, null, 1) + '\n')
}

console.log(JSON.stringify({ dry, shipped: { voice: counts.voice, pictures: counts.picture, recolours: counts.recolour }, unchanged: counts.skipped, recoloursChanged: counts.recolourDiffers }))
console.log('APPROVED ITEMS WITH NO GAME ID:\n  ' + unmapped.sort().join('\n  '))
console.log('GAME IDS WITH NO APPROVED ITEM:\n  ' + noItem.join('\n  '))
console.log('MAPPED BUT NOT OK YET (skipped):\n  ' + notOk.join('\n  '))
