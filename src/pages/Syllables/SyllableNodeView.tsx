import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import {
  SyllableDrill,
  SyllableBlend,
  SyllableSegment,
  MinimalPair,
  type SyllableDrillOption,
  type BlendWord,
  type SegmentWord,
  type SegmentSyllable,
  type MinimalPairData,
} from '../../components/syllables'
import { FeedbackOverlay } from '../../components/common/FeedbackOverlay'
import { useProgressStore } from '../../stores/progressStore'
import { Header } from '../../components/navigation/Navigation'
import { useAudio } from '../../hooks/useAudio'
import { getTTS, isTTSEnabled, preloadTTS } from '../../services/tts'
import type { CVSyllable } from '../../types/entities'

// Syllable data
const SYLLABLES: CVSyllable[] = [
  { id: 'bet-kamatz', letterId: 'bet', nikkudId: 'kamatz', display: 'בָּ', sound: 'ba', audio: '', hasDagesh: true, frequency: 5, order: 1 },
  { id: 'bet-patach', letterId: 'bet', nikkudId: 'patach', display: 'בַּ', sound: 'ba', audio: '', hasDagesh: true, frequency: 4, order: 2 },
  { id: 'bet-tzeire', letterId: 'bet', nikkudId: 'tzeire', display: 'בֵּ', sound: 'be', audio: '', hasDagesh: true, frequency: 4, order: 3 },
  { id: 'bet-segol', letterId: 'bet', nikkudId: 'segol', display: 'בֶּ', sound: 'be', audio: '', hasDagesh: true, frequency: 3, order: 4 },
  { id: 'bet-chirik', letterId: 'bet', nikkudId: 'chirik', display: 'בִּ', sound: 'bi', audio: '', hasDagesh: true, frequency: 4, order: 5 },
  { id: 'bet-cholam', letterId: 'bet', nikkudId: 'cholam', display: 'בֹּ', sound: 'bo', audio: '', hasDagesh: true, frequency: 3, order: 6 },
  { id: 'bet-kubutz', letterId: 'bet', nikkudId: 'kubutz', display: 'בֻּ', sound: 'bu', audio: '', hasDagesh: true, frequency: 3, order: 7 },
  { id: 'mem-kamatz', letterId: 'mem', nikkudId: 'kamatz', display: 'מָ', sound: 'ma', audio: '', hasDagesh: false, frequency: 5, order: 8 },
  { id: 'mem-patach', letterId: 'mem', nikkudId: 'patach', display: 'מַ', sound: 'ma', audio: '', hasDagesh: false, frequency: 4, order: 9 },
  { id: 'mem-chirik', letterId: 'mem', nikkudId: 'chirik', display: 'מִ', sound: 'mi', audio: '', hasDagesh: false, frequency: 4, order: 10 },
  { id: 'mem-tzeire', letterId: 'mem', nikkudId: 'tzeire', display: 'מֵ', sound: 'me', audio: '', hasDagesh: false, frequency: 3, order: 11 },
  { id: 'mem-cholam', letterId: 'mem', nikkudId: 'cholam', display: 'מֹ', sound: 'mo', audio: '', hasDagesh: false, frequency: 3, order: 12 },
  { id: 'lamed-kamatz', letterId: 'lamed', nikkudId: 'kamatz', display: 'לָ', sound: 'la', audio: '', hasDagesh: false, frequency: 5, order: 13 },
  { id: 'lamed-tzeire', letterId: 'lamed', nikkudId: 'tzeire', display: 'לֵ', sound: 'le', audio: '', hasDagesh: false, frequency: 4, order: 14 },
  { id: 'lamed-chirik', letterId: 'lamed', nikkudId: 'chirik', display: 'לִ', sound: 'li', audio: '', hasDagesh: false, frequency: 4, order: 15 },
  { id: 'lamed-cholam', letterId: 'lamed', nikkudId: 'cholam', display: 'לֹ', sound: 'lo', audio: '', hasDagesh: false, frequency: 3, order: 16 },
  { id: 'shin-kamatz', letterId: 'shin', nikkudId: 'kamatz', display: 'שָׁ', sound: 'sha', audio: '', hasDagesh: false, frequency: 5, order: 17 },
  { id: 'shin-tzeire', letterId: 'shin', nikkudId: 'tzeire', display: 'שֵׁ', sound: 'she', audio: '', hasDagesh: false, frequency: 4, order: 18 },
  { id: 'shin-chirik', letterId: 'shin', nikkudId: 'chirik', display: 'שִׁ', sound: 'shi', audio: '', hasDagesh: false, frequency: 4, order: 19 },
  { id: 'shin-cholam', letterId: 'shin', nikkudId: 'cholam', display: 'שֹׁ', sound: 'sho', audio: '', hasDagesh: false, frequency: 3, order: 20 },
  { id: 'dalet-cholam', letterId: 'dalet', nikkudId: 'cholam', display: 'דֹּ', sound: 'do', audio: '', hasDagesh: true, frequency: 3, order: 21 },
  { id: 'dalet-kamatz', letterId: 'dalet', nikkudId: 'kamatz', display: 'דָּ', sound: 'da', audio: '', hasDagesh: true, frequency: 4, order: 22 },
  { id: 'nun-kamatz', letterId: 'nun', nikkudId: 'kamatz', display: 'נָ', sound: 'na', audio: '', hasDagesh: false, frequency: 4, order: 23 },
]

// Activity configurations
type ActivityType = 'drill' | 'blend' | 'segment' | 'pairs'

interface ActivityConfig {
  type: ActivityType
  name: string
  icon: string
  description: string
}

const ACTIVITY_CONFIGS: Record<string, ActivityConfig> = {
  'drill-bet-all': { type: 'drill', name: 'תרגול בֵּית', icon: '🔊', description: 'שמע ובחר' },
  'drill-mem-all': { type: 'drill', name: 'תרגול מֵם', icon: '🔊', description: 'שמע ובחר' },
  'drill-lamed-all': { type: 'drill', name: 'תרגול לָמֶד', icon: '🔊', description: 'שמע ובחר' },
  'drill-shin-all': { type: 'drill', name: 'תרגול שִׁין', icon: '🔊', description: 'שמע ובחר' },
  'drill-mixed-basic': { type: 'drill', name: 'תרגול מעורב', icon: '🎯', description: 'שמע ובחר' },
  'blend-easy': { type: 'blend', name: 'מרכיבים מילים', icon: '🔗', description: 'לחץ על הצֵרוּפִים לפי הסדר' },
  'segment-easy': { type: 'segment', name: 'מפרקים מילים', icon: '✂️', description: 'פרק את המילה לצֵרוּפִים' },
  'pairs-consonant': { type: 'pairs', name: 'צלילים דומים', icon: '👂', description: 'שמע והבחן בין צלילים דומים' },
}

const ACTIVITY_COMPONENTS: Record<ActivityType, string> = {
  drill: 'SyllableDrill',
  blend: 'SyllableBlend',
  segment: 'SyllableSegment',
  pairs: 'MinimalPairPractice'
}

// Drill syllable sets
const DRILL_SYLLABLES: Record<string, string[]> = {
  'drill-bet-all': ['bet-kamatz', 'bet-patach', 'bet-tzeire', 'bet-segol', 'bet-chirik', 'bet-cholam', 'bet-kubutz'],
  'drill-mem-all': ['mem-kamatz', 'mem-patach', 'mem-chirik', 'mem-tzeire', 'mem-cholam'],
  'drill-lamed-all': ['lamed-kamatz', 'lamed-tzeire', 'lamed-chirik', 'lamed-cholam'],
  'drill-shin-all': ['shin-kamatz', 'shin-tzeire', 'shin-chirik', 'shin-cholam'],
  'drill-mixed-basic': ['bet-kamatz', 'mem-kamatz', 'lamed-kamatz', 'shin-kamatz', 'bet-chirik', 'mem-chirik', 'lamed-chirik', 'shin-chirik'],
}

// Blend words data
const BLEND_WORDS: BlendWord[] = [
  { id: 'mama', syllables: [{ id: 'mem-kamatz', display: 'מָ', sound: 'ma' }, { id: 'mem-kamatz', display: 'מָ', sound: 'ma' }], word: 'מָמָא', wordSound: 'mama' },
  { id: 'baba', syllables: [{ id: 'bet-kamatz', display: 'בָּ', sound: 'ba' }, { id: 'bet-kamatz', display: 'בָּ', sound: 'ba' }], word: 'בָּבָּא', wordSound: 'baba' },
  { id: 'doda', syllables: [{ id: 'dalet-cholam', display: 'דֹּ', sound: 'do' }, { id: 'dalet-kamatz', display: 'דָּ', sound: 'da' }], word: 'דּוֹדָה', wordSound: 'doda' },
  { id: 'shalom', syllables: [{ id: 'shin-kamatz', display: 'שָׁ', sound: 'sha' }, { id: 'lamed-cholam', display: 'לֹ', sound: 'lo' }, { id: 'mem-sofit', display: 'ם', sound: 'm' }], word: 'שָׁלוֹם', wordSound: 'shalom' },
]

// Segment words data
const SEGMENT_WORDS: SegmentWord[] = [
  { id: 'mama', word: 'מָמָא', wordSound: 'mama', syllables: [{ id: 'mem-kamatz', display: 'מָ', sound: 'ma' }, { id: 'mem-kamatz', display: 'מָ', sound: 'ma' }] },
  { id: 'baba', word: 'בָּבָּא', wordSound: 'baba', syllables: [{ id: 'bet-kamatz', display: 'בָּ', sound: 'ba' }, { id: 'bet-kamatz', display: 'בָּ', sound: 'ba' }] },
  { id: 'doda', word: 'דּוֹדָה', wordSound: 'doda', syllables: [{ id: 'dalet-cholam', display: 'דֹּ', sound: 'do' }, { id: 'dalet-kamatz', display: 'דָּ', sound: 'da' }] },
]

// Minimal pairs data
const MINIMAL_PAIRS: MinimalPairData[] = [
  { id: 'bet-mem', syllable1: { id: 'bet-kamatz', display: 'בָּ', sound: 'ba' }, syllable2: { id: 'mem-kamatz', display: 'מָ', sound: 'ma' }, contrastType: 'consonant', contrastDescription: 'ב ומ - עיצורים שונים' },
  { id: 'mem-nun', syllable1: { id: 'mem-kamatz', display: 'מָ', sound: 'ma' }, syllable2: { id: 'nun-kamatz', display: 'נָ', sound: 'na' }, contrastType: 'consonant', contrastDescription: 'מ ונ - עיצורים דומים' },
  { id: 'bet-a-i', syllable1: { id: 'bet-kamatz', display: 'בָּ', sound: 'ba' }, syllable2: { id: 'bet-chirik', display: 'בִּ', sound: 'bi' }, contrastType: 'vowel', contrastDescription: 'קָמָץ וחִירִיק - תנועות שונות' },
]

type LearningStep = 'intro' | 'activity' | 'complete'

/**
 * SyllableNodeView - Handles all syllable activity types
 */
export function SyllableNodeView() {
  const { drillId } = useParams<{ drillId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const urlStep = searchParams.get('step') as LearningStep | null
  const currentStep: LearningStep = urlStep || 'intro'

  // Log activity type on load
  useEffect(() => {
    const config = drillId ? ACTIVITY_CONFIGS[drillId] : null
    const activityName = config?.name || 'unknown'
    const component = config ? ACTIVITY_COMPONENTS[config.type] : 'unknown'
    console.log(`[Activity] Level: syllables | Node: ${drillId} | Step: ${currentStep} | Activity: ${activityName} | Component: ${component}`)
  }, [drillId, currentStep])

  const setCurrentStep = useCallback((newStep: LearningStep) => {
    setSearchParams({ step: newStep }, { replace: false })
  }, [setSearchParams])

  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const [shuffledItems, setShuffledItems] = useState<CVSyllable[] | BlendWord[] | SegmentWord[] | MinimalPairData[]>([])

  const recordAttempt = useProgressStore((state) => state.recordAttempt)
  const initializeNode = useProgressStore((state) => state.initializeNode)
  const setNodeState = useProgressStore((state) => state.setNodeState)
  const { play } = useAudio()

  // Get activity config
  const activityConfig = drillId ? ACTIVITY_CONFIGS[drillId] : null
  const activityType = activityConfig?.type || 'drill'

  // Initialize items based on activity type
  useEffect(() => {
    if (!drillId || !activityConfig) return

    let items: CVSyllable[] | BlendWord[] | SegmentWord[] | MinimalPairData[] = []

    switch (activityType) {
      case 'drill': {
        const syllableIds = DRILL_SYLLABLES[drillId] || []
        items = syllableIds
          .map((id) => SYLLABLES.find((s) => s.id === id))
          .filter((s): s is CVSyllable => s !== undefined)
          .sort(() => Math.random() - 0.5)
          .slice(0, 5)
        break
      }
      case 'blend':
        items = [...BLEND_WORDS].sort(() => Math.random() - 0.5).slice(0, 4)
        break
      case 'segment':
        items = [...SEGMENT_WORDS].sort(() => Math.random() - 0.5).slice(0, 3)
        break
      case 'pairs':
        items = [...MINIMAL_PAIRS].sort(() => Math.random() - 0.5).slice(0, 3)
        break
    }

    setShuffledItems(items)
    setCurrentItemIndex(0)
    setCorrectCount(0)
  }, [drillId, activityConfig, activityType])

  // Initialize node on mount
  useEffect(() => {
    if (drillId) {
      const nodeId = `syllables-${drillId}`
      initializeNode(nodeId, 'syllables')
      setNodeState(nodeId, 'in_progress')

      if (!urlStep) {
        setSearchParams({ step: 'intro' }, { replace: true })
      }
    }
  }, [drillId, initializeNode, setNodeState, urlStep, setSearchParams])

  // Preload audio for current activity items only
  useEffect(() => {
    if (!isTTSEnabled() || shuffledItems.length === 0) return

    const sounds: string[] = []
    switch (activityType) {
      case 'drill':
        // Only preload the shuffled items we'll actually use
        (shuffledItems as CVSyllable[]).forEach(s => sounds.push(s.sound))
        break
      case 'blend':
        (shuffledItems as BlendWord[]).forEach(w => {
          w.syllables.forEach(s => sounds.push(s.sound))
          sounds.push(w.wordSound)
        })
        break
      case 'segment':
        (shuffledItems as SegmentWord[]).forEach(w => {
          sounds.push(w.wordSound)
          w.syllables.forEach(s => sounds.push(s.sound))
        })
        break
      case 'pairs':
        (shuffledItems as MinimalPairData[]).forEach(p => {
          sounds.push(p.syllable1.sound, p.syllable2.sound)
        })
        break
    }
    if (sounds.length > 0) {
      preloadTTS([...new Set(sounds)])
    }
  }, [shuffledItems, activityType])

  // Handle unknown activity
  if (!activityConfig || !drillId) {
    return (
      <div style={{ padding: spacing[4] }}>
        <p>פעילות לא נמצאה</p>
        <button onClick={() => navigate('/syllables')}>חזרה</button>
      </div>
    )
  }

  const nodeId = `syllables-${drillId}`
  const totalItems = shuffledItems.length

  // Handlers
  const handleIntroContinue = () => setCurrentStep('activity')

  const handleComplete = () => {
    const successRate = correctCount / totalItems
    if (successRate >= 0.6) {
      setNodeState(nodeId, 'mastered')
    }
    setCurrentStep('complete')
    setShowCelebration(true)
    setTimeout(() => navigate('/syllables'), 3000)
  }

  const handleDrillAnswer = (isCorrect: boolean) => {
    recordAttempt(nodeId, { itemId: `drill-${currentItemIndex}`, correct: isCorrect, timestamp: Date.now(), timeMs: 0 })
    if (isCorrect) setCorrectCount((c) => c + 1)
  }

  const handleDrillComplete = () => {
    if (currentItemIndex < totalItems - 1) {
      setCurrentItemIndex((i) => i + 1)
    } else {
      handleComplete()
    }
  }

  const handleBlendComplete = () => {
    setCorrectCount((c) => c + 1)
    recordAttempt(nodeId, { itemId: `blend-${currentItemIndex}`, correct: true, timestamp: Date.now(), timeMs: 0 })
    if (currentItemIndex < totalItems - 1) {
      setCurrentItemIndex((i) => i + 1)
    } else {
      handleComplete()
    }
  }

  const handleSegmentComplete = (isCorrect: boolean) => {
    recordAttempt(nodeId, { itemId: `segment-${currentItemIndex}`, correct: isCorrect, timestamp: Date.now(), timeMs: 0 })
    if (isCorrect) {
      setCorrectCount((c) => c + 1)
      if (currentItemIndex < totalItems - 1) {
        setCurrentItemIndex((i) => i + 1)
      } else {
        handleComplete()
      }
    }
  }

  const handlePairComplete = (correct: number) => {
    recordAttempt(nodeId, { itemId: `pair-${currentItemIndex}`, correct: correct >= 3, timestamp: Date.now(), timeMs: 0 })
    if (correct >= 3) setCorrectCount((c) => c + 1)
    if (currentItemIndex < totalItems - 1) {
      setCurrentItemIndex((i) => i + 1)
    } else {
      handleComplete()
    }
  }

  // Audio handlers
  const handlePlaySyllable = useCallback((syllable: { sound: string }) => {
    if (isTTSEnabled()) {
      play(getTTS(syllable.sound)).catch(console.error)
    }
  }, [play])

  const handlePlayWord = useCallback((word: { wordSound: string }) => {
    if (isTTSEnabled()) {
      play(getTTS(word.wordSound)).catch(console.error)
    }
  }, [play])

  // Generate drill options
  const generateDrillOptions = useCallback((): SyllableDrillOption[] => {
    const target = shuffledItems[currentItemIndex] as CVSyllable
    if (!target) return []
    const distractors = SYLLABLES.filter((s) => s.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 3)
    return [{ syllable: target, isCorrect: true }, ...distractors.map((s) => ({ syllable: s, isCorrect: false }))].sort(() => Math.random() - 0.5)
  }, [shuffledItems, currentItemIndex])

  // Generate segment options (only for segment activity type)
  const segmentOptions = useMemo((): SegmentSyllable[] => {
    if (activityType !== 'segment') return []
    const word = shuffledItems[currentItemIndex] as SegmentWord
    if (!word || !word.syllables) return []
    const extraOptions = SYLLABLES.slice(0, 6).map((s) => ({ id: s.id, display: s.display, sound: s.sound }))
    return [...word.syllables, ...extraOptions.filter((o) => !word.syllables.some((w) => w.id === o.id))].sort(() => Math.random() - 0.5).slice(0, 6)
  }, [shuffledItems, currentItemIndex, activityType])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', flexDirection: 'column' }}>
      <Header title={activityConfig.name} subtitle={activityConfig.description} showBack onBack={() => navigate('/syllables')} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: spacing[4], position: 'relative' }}>
        <AnimatePresence mode="wait">
          {currentStep === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: spacing[6], textAlign: 'center' }}
            >
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ fontSize: '5rem' }}>
                {activityConfig.icon}
              </motion.div>
              <h2 style={{ fontFamily: typography.fontFamily.hebrew, fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.primary[600] }}>
                {activityConfig.name}
              </h2>
              <p style={{ fontFamily: typography.fontFamily.hebrew, fontSize: typography.fontSize.xl, color: colors.text.secondary, maxWidth: '300px' }}>
                {activityConfig.description}
              </p>
              <motion.button
                onClick={handleIntroContinue}
                style={{ padding: `${spacing[4]} ${spacing[8]}`, borderRadius: borderRadius.full, border: 'none', backgroundColor: colors.primary[500], fontFamily: typography.fontFamily.hebrew, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.surface, cursor: 'pointer', boxShadow: shadows.md }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                התחל! 🎯
              </motion.button>
            </motion.div>
          )}

          {currentStep === 'activity' && shuffledItems.length > 0 && (
            <motion.div key="activity" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {activityType === 'drill' && (
                <SyllableDrill
                  targetSyllable={shuffledItems[currentItemIndex] as CVSyllable}
                  options={generateDrillOptions()}
                  onAnswer={handleDrillAnswer}
                  onComplete={handleDrillComplete}
                  onPlaySound={() => handlePlaySyllable(shuffledItems[currentItemIndex] as CVSyllable)}
                  currentItem={currentItemIndex + 1}
                  totalItems={totalItems}
                />
              )}
              {activityType === 'blend' && (
                <SyllableBlend
                  blendWord={shuffledItems[currentItemIndex] as BlendWord}
                  onComplete={handleBlendComplete}
                  onPlaySyllable={handlePlaySyllable}
                  onPlayWord={() => handlePlayWord(shuffledItems[currentItemIndex] as BlendWord)}
                  currentItem={currentItemIndex + 1}
                  totalItems={totalItems}
                />
              )}
              {activityType === 'segment' && (
                <SyllableSegment
                  segmentWord={shuffledItems[currentItemIndex] as SegmentWord}
                  options={segmentOptions}
                  onComplete={handleSegmentComplete}
                  onPlayWord={() => handlePlayWord(shuffledItems[currentItemIndex] as SegmentWord)}
                  onPlaySyllable={handlePlaySyllable}
                  currentItem={currentItemIndex + 1}
                  totalItems={totalItems}
                />
              )}
              {activityType === 'pairs' && (
                <MinimalPair
                  pair={shuffledItems[currentItemIndex] as MinimalPairData}
                  onComplete={handlePairComplete}
                  onPlaySyllable={handlePlaySyllable}
                  currentItem={currentItemIndex + 1}
                  totalItems={totalItems}
                />
              )}
            </motion.div>
          )}

          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
            >
              <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }} style={{ fontSize: '6rem', marginBottom: spacing[4] }}>
                🎉
              </motion.div>
              <h2 style={{ fontFamily: typography.fontFamily.hebrew, fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.secondary[600], marginBottom: spacing[2] }}>
                כל הכבוד!
              </h2>
              <p style={{ fontFamily: typography.fontFamily.hebrew, fontSize: typography.fontSize.xl, color: colors.text.secondary, marginBottom: spacing[6] }}>
                סיימת את {activityConfig.name}!
              </p>
              <motion.div style={{ backgroundColor: colors.secondary[50], padding: spacing[6], borderRadius: borderRadius['2xl'], boxShadow: shadows.lg }} animate={{ y: [0, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <p style={{ fontFamily: typography.fontFamily.hebrew, fontSize: typography.fontSize['2xl'], color: colors.secondary[700] }}>
                  {correctCount} / {totalItems} נכונים
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <FeedbackOverlay visible={showCelebration} type="celebration" message={`סיימת את ${activityConfig.name}!`} onHide={() => setShowCelebration(false)} autoHideMs={2500} />
      </main>
    </div>
  )
}

export default SyllableNodeView
