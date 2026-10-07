import { useNavigate } from 'react-router-dom'
import { DuelEntryCard } from '../../components/duel/DuelEntryCard'
import { colors, typography, spacing } from '../../styles/theme'
import { JourneyPath, type JourneyNode } from '../../components/navigation/JourneyPath'
import { Header } from '../../components/navigation/Navigation'
import { useProgressStore } from '../../stores/progressStore'
import { useResponsive } from '../../hooks/useResponsive'
import { NIKKUD_NODES } from '../../data/levelNodes'

/**
 * NikkudPage - Main page for nikkud (vowel marks) learning journey
 * Shows journey path with all nikkud nodes
 */
export function NikkudPage() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const nodes = useProgressStore((state) => state.nodes)
  const initializeNode = useProgressStore((state) => state.initializeNode)
  const isLevelUnlocked = useProgressStore((state) => state.isLevelUnlocked)
  const devMode = useProgressStore((state) => state.settings.devMode)

  // Check if nikkud level is unlocked
  const levelUnlocked = isLevelUnlocked('nikkud')

  // Convert nikkud to journey nodes with progress state
  const journeyNodes: JourneyNode[] = NIKKUD_NODES.map((nikkud, index) => {
    const nodeId = `nikkud-${nikkud.id}`
    const progress = nodes[nodeId]

    // Determine node state
    let state: JourneyNode['state'] = 'locked'

    // Dev mode: all nodes available
    if (devMode) {
      state = progress?.state || 'available'
    } else if (!levelUnlocked) {
      // Level not unlocked, all nodes are locked
      state = 'locked'
    } else if (index === 0) {
      // First nikkud is always available once level is unlocked
      state = progress?.state || 'available'
      if (!progress) {
        initializeNode(nodeId, 'nikkud')
      }
    } else {
      // Other nikkud depend on previous nikkud's progress
      const prevNodeId = `nikkud-${NIKKUD_NODES[index - 1].id}`
      const prevProgress = nodes[prevNodeId]

      if (prevProgress?.state === 'mastered' || prevProgress?.state === 'in_progress') {
        // Previous nikkud started, this one becomes available
        state = progress?.state || 'available'
        if (!progress) {
          initializeNode(nodeId, 'nikkud')
        }
      } else if (progress) {
        state = progress.state
      }
    }

    // Display as alef + nikkud for visibility (full vowels show just the mark)
    return {
      id: nodeId,
      label: nikkud.isFullVowel ? nikkud.mark : `א${nikkud.mark}`,
      state,
      order: index + 1,
    }
  })

  const handleNodeClick = (nodeId: string) => {
    const node = journeyNodes.find((n) => n.id === nodeId)
    if (node && (devMode || node.state !== 'locked')) {
      navigate(`/nikkud/${nodeId.replace('nikkud-', '')}`)
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
        paddingBottom: isMobile ? '80px' : '0',
      }}
    >
      <Header
        title="ניקוד"
        subtitle="למד להכיר את הניקוד"
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
        {/* Nikkud Wizard Duel — shown whether or not the level is locked */}
        <DuelEntryCard compact />

        {!levelUnlocked ? (
          // Level locked message
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: spacing[6],
            }}
          >
            <span style={{ fontSize: '4rem', marginBottom: spacing[4] }}>🔒</span>
            <h2
              style={{
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                marginBottom: spacing[2],
              }}
            >
              הרמה נעולה
            </h2>
            <p
              style={{
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize.lg,
                color: colors.text.secondary,
                maxWidth: '300px',
              }}
            >
              סיים את רמת האותיות כדי לפתוח את רמת הניקוד
            </p>
          </div>
        ) : (
          <>
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
                {journeyNodes.length} סימני ניקוד נלמדו
              </p>
            </div>

            {/* Journey path */}
            <JourneyPath
              nodes={journeyNodes}
              onNodeClick={handleNodeClick}
              title="מסע הניקוד שלי"
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
              לחץ על ניקוד כדי להתחיל ללמוד 👆
            </p>
          </>
        )}
      </main>
    </div>
  )
}

export default NikkudPage
