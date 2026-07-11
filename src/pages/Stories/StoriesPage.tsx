import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { useProgressStore } from '../../stores/progressStore'
import storiesYaml from '../../data/stories.yaml'
import type { StoriesData } from '../../types/story'

const { stories } = storiesYaml as StoriesData

/**
 * StoriesPage - story picker for the story reading game
 */
export function StoriesPage() {
  const navigate = useNavigate()
  const getNodeProgress = useProgressStore((state) => state.getNodeProgress)
  const sorted = [...stories].sort((a, b) => a.difficulty - b.difficulty)

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: spacing[4],
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
          width: '100%',
          maxWidth: '600px',
          padding: `${spacing[4]} 0`,
        }}
      >
        <motion.button
          onClick={() => navigate('/')}
          style={{
            border: 'none',
            backgroundColor: colors.neutral[100],
            borderRadius: borderRadius.full,
            width: '44px',
            height: '44px',
            fontSize: '1.25rem',
            cursor: 'pointer',
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          →
        </motion.button>
        <h1
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[600],
            margin: '0 auto',
            direction: 'rtl',
          }}
        >
          📚 סִפּוּרִים
        </h1>
        <div style={{ width: '44px' }} />
      </header>

      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[4],
          width: '100%',
          maxWidth: '600px',
        }}
      >
        {sorted.map((story, index) => {
          const completed =
            getNodeProgress(`stories-${story.id}`)?.state === 'mastered'
          return (
            <motion.button
              key={story.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08 * index }}
              onClick={() => navigate(`/stories/${story.id}`)}
              style={{
                display: 'flex',
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: spacing[4],
                padding: spacing[4],
                borderRadius: borderRadius['2xl'],
                border: `2px solid ${colors.primary[200]}`,
                backgroundColor: colors.surface,
                boxShadow: shadows.md,
                cursor: 'pointer',
                width: '100%',
              }}
              whileHover={{ scale: 1.02, boxShadow: shadows.lg }}
              whileTap={{ scale: 0.98 }}
            >
              <span style={{ fontSize: '3rem', lineHeight: 1 }}>{story.emoji}</span>
              <span
                style={{
                  flex: 1,
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  direction: 'rtl',
                  textAlign: 'right',
                }}
              >
                {story.title}
              </span>
              <span style={{ fontSize: typography.fontSize.sm }}>
                {'⭐'.repeat(story.difficulty)}
              </span>
              {completed && <span style={{ fontSize: '1.5rem' }}>✅</span>}
            </motion.button>
          )
        })}
      </main>
    </div>
  )
}

export default StoriesPage
