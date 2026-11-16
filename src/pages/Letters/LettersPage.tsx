import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors, typography, spacing } from '../../styles/theme'
import { JourneyPath, type JourneyNode } from '../../components/navigation/JourneyPath'
import { Header } from '../../components/navigation/Navigation'
import { useProgressStore } from '../../stores/progressStore'
import { useResponsive } from '../../hooks/useResponsive'

// Hebrew letters in order (22 base + 5 sofiyot)
const LETTERS = [
  { id: 'alef', char: 'א' },
  { id: 'bet', char: 'ב' },
  { id: 'gimel', char: 'ג' },
  { id: 'dalet', char: 'ד' },
  { id: 'he', char: 'ה' },
  { id: 'vav', char: 'ו' },
  { id: 'zayin', char: 'ז' },
  { id: 'chet', char: 'ח' },
  { id: 'tet', char: 'ט' },
  { id: 'yod', char: 'י' },
  { id: 'kaf', char: 'כ' },
  { id: 'lamed', char: 'ל' },
  { id: 'mem', char: 'מ' },
  { id: 'nun', char: 'נ' },
  { id: 'samech', char: 'ס' },
  { id: 'ayin', char: 'ע' },
  { id: 'pe', char: 'פ' },
  { id: 'tsadi', char: 'צ' },
  { id: 'qof', char: 'ק' },
  { id: 'resh', char: 'ר' },
  { id: 'shin', char: 'ש' },
  { id: 'tav', char: 'ת' },
  // Sofiyot
  { id: 'kaf-sofit', char: 'ך' },
  { id: 'mem-sofit', char: 'ם' },
  { id: 'nun-sofit', char: 'ן' },
  { id: 'pe-sofit', char: 'ף' },
  { id: 'tsadi-sofit', char: 'ץ' },
]

/**
 * LettersPage - Main page for letter learning journey
 * Shows journey path with all letter nodes
 */
export function LettersPage() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const nodes = useProgressStore((state) => state.nodes)
  const initializeNode = useProgressStore((state) => state.initializeNode)
  const devMode = useProgressStore((state) => state.settings.devMode)

  // Convert letters to journey nodes with progress state
  const toInit: string[] = []
  const journeyNodes: JourneyNode[] = LETTERS.map((letter, index) => {
    const nodeId = `letters-${letter.id}`
    const progress = nodes[nodeId]

    // Determine node state
    let state: JourneyNode['state'] = 'locked'

    // Dev mode: all nodes available
    if (devMode) {
      state = progress?.state || 'available'
    } else if (index === 0) {
      // First letter is always available
      state = progress?.state || 'available'
      if (!progress) {
        toInit.push(nodeId)
      }
    } else {
      // Other letters depend on previous letter's progress
      const prevNodeId = `letters-${LETTERS[index - 1].id}`
      const prevProgress = nodes[prevNodeId]

      if (prevProgress?.state === 'mastered' || prevProgress?.state === 'in_progress') {
        // Previous letter started, this one becomes available
        state = progress?.state || 'available'
        if (!progress) {
          toInit.push(nodeId)
        }
      } else if (progress) {
        state = progress.state
      }
    }

    return {
      id: nodeId,
      label: letter.char,
      state,
      order: index + 1,
    }
  })

  // Create the saved record of every open node after the render, never during it
  const toInitKey = toInit.join(',')
  useEffect(() => {
    if (toInitKey) toInitKey.split(',').forEach((id) => initializeNode(id, 'letters'))
  }, [toInitKey, initializeNode])

  const handleNodeClick = (nodeId: string) => {
    const node = journeyNodes.find((n) => n.id === nodeId)
    if (node && (devMode || node.state !== 'locked')) {
      navigate(`/letters/${nodeId.replace('letters-', '')}`)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: isMobile ? '80px' : '0', // Space for bottom nav
      }}
    >
      <Header
        title="אותיות"
        subtitle="למד להכיר את האותיות העבריות"
        showBack
        onBack={handleBack}
      />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: spacing[4],
        }}
      >
        {/* Progress summary */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: spacing[6],
          }}
        >
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.lg,
              color: colors.text.secondary,
            }}
          >
            {journeyNodes.filter((n) => n.state === 'mastered').length} מתוך{' '}
            {journeyNodes.length} אותיות נלמדו
          </p>
        </div>

        {/* Journey path */}
        <JourneyPath
          nodes={journeyNodes}
          onNodeClick={handleNodeClick}
          title="מסע האותיות שלי"
        />

        {/* Hint */}
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            textAlign: 'center',
            marginTop: spacing[6],
          }}
        >
          לחץ על אות כדי להתחיל ללמוד 👆
        </p>
      </main>
    </div>
  )
}

export default LettersPage
