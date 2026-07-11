import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { TappableText } from '../../components/stories'
import type { Story } from '../../types/story'

export interface StoryReadViewProps {
  story: Story
  onFinished: () => void
}

/**
 * StoryReadView - the reading screen. Title + paragraphs, every word tappable.
 */
export function StoryReadView({ story, onFinished }: StoryReadViewProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[5],
        width: '100%',
        maxWidth: '600px',
      }}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          padding: spacing[5],
          backgroundColor: colors.surface,
          borderRadius: borderRadius['2xl'],
          boxShadow: shadows.lg,
        }}
      >
        <h1 style={{ textAlign: 'center', margin: 0, marginBottom: spacing[4] }}>
          <TappableText
            text={`${story.emoji} ${story.title}`}
            blockId="title"
            fontSize={typography.fontSize['3xl']}
            fontWeight={typography.fontWeight.bold}
            color={colors.primary[600]}
          />
        </h1>
        {story.paragraphs.map((paragraph, index) => (
          <p
            key={index}
            style={{
              direction: 'rtl',
              textAlign: 'right',
              lineHeight: 2.4,
              margin: 0,
              marginBottom: spacing[4],
            }}
          >
            <TappableText
              text={paragraph}
              blockId={`p${index}`}
              fontSize={typography.fontSize['2xl']}
              color={colors.text.primary}
            />
          </p>
        ))}
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onFinished}
        style={{
          padding: `${spacing[3]} ${spacing[4]}`,
          borderRadius: borderRadius.xl,
          border: 'none',
          backgroundColor: colors.primary[500],
          boxShadow: shadows.md,
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: colors.surface,
          cursor: 'pointer',
        }}
        whileHover={{ scale: 1.02, backgroundColor: colors.primary[600] }}
        whileTap={{ scale: 0.98 }}
      >
        סִיַּמְתִּי לִקְרֹא ←
      </motion.button>
    </div>
  )
}

export default StoryReadView
