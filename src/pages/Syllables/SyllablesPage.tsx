import { useNavigate } from 'react-router-dom'
import { colors, typography, spacing } from '../../styles/theme'
import { JourneyPath, type JourneyNode } from '../../components/navigation/JourneyPath'
import { Header } from '../../components/navigation/Navigation'
import { useProgressStore } from '../../stores/progressStore'
import { useResponsive } from '../../hooks/useResponsive'
import { SYLLABLE_NODES } from '../../data/levelNodes'

/**
 * SyllablesPage - Main page for CV syllable drilling journey
 * Shows journey path with all syllable drill nodes
 */
export function SyllablesPage() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const nodes = useProgressStore((state) => state.nodes)
  const initializeNode = useProgressStore((state) => state.initializeNode)
  const isLevelUnlocked = useProgressStore((state) => state.isLevelUnlocked)
  const devMode = useProgressStore((state) => state.settings.devMode)

  // Check if syllables level is unlocked
  const levelUnlocked = isLevelUnlocked('syllables')

  // Convert activities to journey nodes with progress state
  const journeyNodes: JourneyNode[] = SYLLABLE_NODES.map((activity, index) => {
    const nodeId = `syllables-${activity.id}`
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
      // First activity is always available once level is unlocked
      state = progress?.state || 'available'
      if (!progress) {
        initializeNode(nodeId, 'syllables')
      }
    } else {
      // Other activities depend on previous activity's progress
      const prevNodeId = `syllables-${SYLLABLE_NODES[index - 1].id}`
      const prevProgress = nodes[prevNodeId]

      if (prevProgress?.state === 'mastered' || prevProgress?.state === 'in_progress') {
        // Previous activity started, this one becomes available
        state = progress?.state || 'available'
        if (!progress) {
          initializeNode(nodeId, 'syllables')
        }
      } else if (progress) {
        state = progress.state
      }
    }

    return {
      id: nodeId,
      label: activity.display,
      state,
      order: activity.order,
    }
  })

  const handleNodeClick = (nodeId: string) => {
    const node = journeyNodes.find((n) => n.id === nodeId)
    if (node && (devMode || node.state !== 'locked')) {
      navigate(`/syllables/${nodeId.replace('syllables-', '')}`)
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
        title="צֵרוּפִים"
        subtitle="תרגול קריאת צֵרוּפִים"
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
              סיים את רמת הניקוד כדי לפתוח את רמת הצֵרוּפִים
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
                {journeyNodes.length} תרגולים הושלמו
              </p>
            </div>

            {/* Journey path */}
            <JourneyPath
              nodes={journeyNodes}
              onNodeClick={handleNodeClick}
              title="מסע הצֵרוּפִים שלי"
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
              לחץ על תרגול כדי להתחיל ללמוד 👆
            </p>
          </>
        )}
      </main>
    </div>
  )
}

export default SyllablesPage
