#!/usr/bin/env node

/**
 * Audio Generation Script for Hebrew Reading Game
 *
 * Uses ElevenLabs TTS API to generate pronunciation audio files
 * for letters, nikkud, words, and sentences.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key node scripts/generate-audio.js
 *
 * Options:
 *   --type=letters|nikkud|words|sentences  Generate specific type only
 *   --dry-run                              Show what would be generated
 *   --force                                Regenerate existing files
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as yaml from 'js-yaml'

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const CONFIG = {
  apiKey: process.env.ELEVENLABS_API_KEY || '',
  voiceId: 'cgSgspJ2msm6clMCkdW9', // Jessica voice ID
  modelId: 'eleven_v3', // Latest model, best Hebrew pronunciation
  outputDir: path.join(__dirname, '../public/assets/audio'),
  trackingFile: path.join(__dirname, '../public/assets/audio/generation-manifest.json'),
  dataDir: path.join(__dirname, '../src/data'),
}

// Types
interface GenerationManifest {
  version: number
  lastUpdated: string
  generated: Record<string, GeneratedFile>
  failed: Record<string, string>
  pending: string[]
}

interface GeneratedFile {
  id: string
  type: 'letter' | 'nikkud' | 'word' | 'sentence' | 'combination'
  text: string
  filepath: string
  generatedAt: string
  duration?: number
}

interface Letter {
  id: string
  char: string
  name: string
  sound: string
}

interface Nikkud {
  id: string
  mark: string
  name: string
  sound: string
  exampleCombo: string
}

interface Word {
  id: string
  word: string
  syllables: string[]
}

interface Sentence {
  id: string
  sentence: string
}

// Load or create manifest
function loadManifest(): GenerationManifest {
  if (fs.existsSync(CONFIG.trackingFile)) {
    const content = fs.readFileSync(CONFIG.trackingFile, 'utf-8')
    return JSON.parse(content)
  }
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    generated: {},
    failed: {},
    pending: [],
  }
}

// Save manifest
function saveManifest(manifest: GenerationManifest): void {
  manifest.lastUpdated = new Date().toISOString()
  fs.writeFileSync(CONFIG.trackingFile, JSON.stringify(manifest, null, 2))
  console.log(`📝 Manifest saved to ${CONFIG.trackingFile}`)
}

// Load YAML data
function loadYaml<T>(filename: string): T {
  const filepath = path.join(CONFIG.dataDir, filename)
  const content = fs.readFileSync(filepath, 'utf-8')
  return yaml.load(content) as T
}

// Call ElevenLabs API
async function generateAudio(text: string, outputPath: string): Promise<boolean> {
  if (!CONFIG.apiKey) {
    console.error('❌ ELEVENLABS_API_KEY not set')
    return false
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.voiceId}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': CONFIG.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: CONFIG.modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ API error for "${text}": ${response.status} - ${error}`)
      return false
    }

    const buffer = await response.arrayBuffer()

    // Ensure directory exists
    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(outputPath, Buffer.from(buffer))
    console.log(`✅ Generated: ${outputPath}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to generate "${text}":`, error)
    return false
  }
}

// Generate audio items
interface AudioItem {
  id: string
  type: 'letter' | 'nikkud' | 'word' | 'sentence' | 'combination'
  text: string
  filepath: string
}

function collectLetterItems(): AudioItem[] {
  const data = loadYaml<{ letters: Letter[] }>('letters.yaml')
  const items: AudioItem[] = []

  for (const letter of data.letters) {
    // Letter name only (e.g., "אלף")
    // Sound audio removed - was using English letter equivalents which isn't useful
    // for Hebrew-native speakers. Fun facts include example words instead.
    items.push({
      id: `letter-${letter.id}-name`,
      type: 'letter',
      text: letter.name,
      filepath: path.join(CONFIG.outputDir, 'letters', `${letter.id}-name.mp3`),
    })
  }

  return items
}

function collectNikkudItems(): AudioItem[] {
  const data = loadYaml<{ nikkud: Nikkud[], combinations: any[] }>('nikkud.yaml')
  const items: AudioItem[] = []

  for (const n of data.nikkud) {
    // Nikkud name
    items.push({
      id: `nikkud-${n.id}-name`,
      type: 'nikkud',
      text: n.name,
      filepath: path.join(CONFIG.outputDir, 'nikkud', `${n.id}-name.mp3`),
    })

    // Nikkud sound/example
    if (n.exampleCombo) {
      items.push({
        id: `nikkud-${n.id}-example`,
        type: 'nikkud',
        text: n.exampleCombo,
        filepath: path.join(CONFIG.outputDir, 'nikkud', `${n.id}-example.mp3`),
      })
    }
  }

  // Combinations
  if (data.combinations) {
    for (const combo of data.combinations) {
      items.push({
        id: `combo-${combo.letterId}-${combo.nikkudId}`,
        type: 'combination',
        text: combo.display,
        filepath: path.join(CONFIG.outputDir, 'combinations', `${combo.letterId}-${combo.nikkudId}.mp3`),
      })
    }
  }

  return items
}

function collectWordItems(): AudioItem[] {
  const data = loadYaml<{ words: Word[] }>('words.yaml')
  const items: AudioItem[] = []

  for (const word of data.words) {
    // Full word
    items.push({
      id: `word-${word.id}`,
      type: 'word',
      text: word.word,
      filepath: path.join(CONFIG.outputDir, 'words', `${word.id}.mp3`),
    })

    // Individual syllables
    if (word.syllables) {
      word.syllables.forEach((syllable, index) => {
        items.push({
          id: `word-${word.id}-syllable-${index}`,
          type: 'word',
          text: syllable,
          filepath: path.join(CONFIG.outputDir, 'words', `${word.id}-syllable-${index}.mp3`),
        })
      })
    }
  }

  return items
}

function collectSentenceItems(): AudioItem[] {
  const data = loadYaml<{ sentences: Sentence[] }>('sentences.yaml')
  const items: AudioItem[] = []

  for (const sentence of data.sentences) {
    items.push({
      id: `sentence-${sentence.id}`,
      type: 'sentence',
      text: sentence.sentence,
      filepath: path.join(CONFIG.outputDir, 'sentences', `${sentence.id}.mp3`),
    })
  }

  return items
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const typeFilter = args.find(a => a.startsWith('--type='))?.split('=')[1]
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')

  console.log('🎵 Hebrew Reading Game - Audio Generator')
  console.log('========================================')

  if (!CONFIG.apiKey) {
    console.log('⚠️  ELEVENLABS_API_KEY not set - running in dry-run mode')
  }

  // Load manifest
  const manifest = loadManifest()

  // Collect items to generate
  let items: AudioItem[] = []

  if (!typeFilter || typeFilter === 'letters') {
    items = items.concat(collectLetterItems())
  }
  if (!typeFilter || typeFilter === 'nikkud') {
    items = items.concat(collectNikkudItems())
  }
  if (!typeFilter || typeFilter === 'words') {
    items = items.concat(collectWordItems())
  }
  if (!typeFilter || typeFilter === 'sentences') {
    items = items.concat(collectSentenceItems())
  }

  console.log(`\n📋 Found ${items.length} audio items to process`)

  // Filter out already generated (unless force)
  if (!force) {
    items = items.filter(item => !manifest.generated[item.id])
    console.log(`📋 ${items.length} items need generation (${Object.keys(manifest.generated).length} already done)`)
  }

  if (dryRun) {
    console.log('\n🔍 Dry run - would generate:')
    items.forEach(item => {
      console.log(`  - ${item.id}: "${item.text}" → ${item.filepath}`)
    })
    return
  }

  if (!CONFIG.apiKey) {
    console.log('\n⚠️  Set ELEVENLABS_API_KEY to generate audio')

    // Save pending items to manifest
    manifest.pending = items.map(i => i.id)
    saveManifest(manifest)
    return
  }

  // Generate audio with rate limiting
  console.log('\n🎤 Starting generation...')
  let successCount = 0
  let failCount = 0

  for (const item of items) {
    const success = await generateAudio(item.text, item.filepath)

    if (success) {
      manifest.generated[item.id] = {
        id: item.id,
        type: item.type,
        text: item.text,
        filepath: item.filepath.replace(CONFIG.outputDir, ''),
        generatedAt: new Date().toISOString(),
      }
      delete manifest.failed[item.id]
      successCount++
    } else {
      manifest.failed[item.id] = item.text
      failCount++
    }

    // Save manifest periodically
    if ((successCount + failCount) % 10 === 0) {
      saveManifest(manifest)
    }

    // Rate limiting - ElevenLabs has limits
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Remove from pending
  manifest.pending = manifest.pending.filter(id => !manifest.generated[id])

  // Final save
  saveManifest(manifest)

  console.log('\n========================================')
  console.log(`✅ Successfully generated: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📊 Total in manifest: ${Object.keys(manifest.generated).length}`)
}

main().catch(console.error)
