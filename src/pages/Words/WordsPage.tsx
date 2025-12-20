import { useNavigate } from 'react-router-dom'
import { colors, typography, spacing } from '../../styles/theme'
import { JourneyPath, type JourneyNode } from '../../components/navigation/JourneyPath'
import { Header } from '../../components/navigation/Navigation'
import { useProgressStore } from '../../stores/progressStore'
import { useResponsive } from '../../hooks/useResponsive'
import { WORD_NODES } from '../../data/levelNodes'

/**
 * WordsPage - Main page for word reading journey
 * Shows journey path with word category nodes
 */
export function WordsPage() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const nodes = useProgressStore((state) => state.nodes)
  const initializeNode = useProgressStore((state) => state.initializeNode)
  const isLevelUnlocked = useProgressStore((state) => state.isLevelUnlocked)
  const devMode = useProgressStore((state) => state.settings.devMode)

  // Check if words level is unlocked
  const levelUnlocked = isLevelUnlocked('words')

  // Convert word groups to journey nodes with progress state
  const journeyNodes: JourneyNode[] = WORD_NODES.map((group, index) => {
    const nodeId = `words-${group.id}`
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
      // First group is always available once level is unlocked
      state = progress?.state || 'available'
      if (!progress) {
        initializeNode(nodeId, 'words')
      }
    } else {
      // Other groups depend on previous group's progress
      const prevNodeId = `words-${WORD_NODES[index - 1].id}`
      const prevProgress = nodes[prevNodeId]

      if (prevProgress?.state === 'mastered' || prevProgress?.state === 'in_progress') {
        // Previous group started, this one becomes available
        state = progress?.state || 'available'
        if (!progress) {
          initializeNode(nodeId, 'words')
        }
      } else if (progress) {
        state = progress.state
      }
    }

    return {
      id: nodeId,
      label: group.icon,
      state,
      order: index + 1,
    }
  })

  const handleNodeClick = (nodeId: string) => {
    const node = journeyNodes.find((n) => n.id === nodeId)
    if (node && (devMode || node.state !== 'locked')) {
      navigate(`/words/${nodeId.replace('words-', '')}`)
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
        title="מילים"
        subtitle="למד לקרוא מילים פשוטות"
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
              סיים את רמת הניקוד כדי לפתוח את רמת המילים
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
                {journeyNodes.length} קבוצות מילים נלמדו
              </p>
            </div>

            {/* Journey path */}
            <JourneyPath
              nodes={journeyNodes}
              onNodeClick={handleNodeClick}
              title="מסע המילים שלי"
            />

            {/* Word group names */}
            <div
              style={{
                marginTop: spacing[6],
                display: 'flex',
                flexDirection: 'column',
                gap: spacing[2],
                alignItems: 'center',
              }}
            >
              {WORD_NODES.map((group, index) => {
                const node = journeyNodes[index]
                const isUnlocked = node.state !== 'locked'

                return (
                  <p
                    key={group.id}
                    style={{
                      fontFamily: typography.fontFamily.hebrew,
                      fontSize: typography.fontSize.sm,
                      color: isUnlocked ? colors.text.secondary : colors.text.disabled,
                    }}
                  >
                    {group.icon} {group.name}
                  </p>
                )
              })}
            </div>

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
              לחץ על קבוצה כדי להתחיל ללמוד 👆
            </p>
          </>
        )}
      </main>
    </div>
  )
}

export default WordsPage
