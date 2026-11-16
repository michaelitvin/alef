import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { colors, typography, spacing } from '../../styles/theme'
import { useProgressStore } from '../../stores/progressStore'
import { useResponsive } from '../../hooks/useResponsive'
import { DuelCard } from '../../components/home/DuelCard'
import { StationPath } from '../../components/home/StationPath'
import { Separator } from '../../components/home/Separator'
import { ClockCard } from '../../components/home/ClockCard'
import { LevelShelf } from '../../components/home/LevelShelf'
import { GearIcon, StarIcon, TargetIcon, ChartIcon } from '../../components/home/HomeIcons'
import { ParentGate } from '../../shared/parentGate/ParentGate'
import { passGate } from '../../parent/gateToken'
import '../../components/home/home.css'

/**
 * HomePage (spec: one duel, Part 4; the approved mock): the duel card and the path of its minigames, a separator, the
 * clock card, a separator, and the older activities as a shelf of small icons. Right to left throughout.
 */
export function HomePage() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const stats = useProgressStore((state) => state.stats)
  const startSession = useProgressStore((state) => state.startSession)

  // Start session on first visit
  if (!stats.lastSessionAt) {
    startSession()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f4efe6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: isMobile ? '100px' : spacing[8],
        position: 'relative',
      }}
    >
      {/* the settings gear is the parent gate (rule: a 2 s hold, then the year of birth); it opens the parent area at once,
          and the area's route asks again on any other way in (Back, Forward, a reload) */}
      <div data-home-settings className="home-gear-box">
        <ParentGate label="settings (hold)" className="home-gear" onOpen={() => { passGate(); navigate('/settings') }}
          ring={{ track: colors.neutral[200], fill: colors.primary[500], width: 4, trackWidth: 4 }}
          overlay={<GearIcon />} />
      </div>

      {/* Header */}
      <motion.header
        className="home-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          textAlign: 'center',
          padding: `${spacing[8]} ${spacing[4]}`,
          width: '100%',
        }}
      >
        <h1
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: isMobile ? typography.fontSize['4xl'] : typography.fontSize['5xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[600],
            marginBottom: spacing[2],
          }}
        >
          אָלֶף
        </h1>
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['2xl'],
            color: colors.text.secondary,
          }}
        >
          לומדים לקרוא בעברית!
        </p>
      </motion.header>

      {/* the duel and its path, the clock, the older activities (the approved mock's layout and values) */}
      <main className="home-box" data-home>
        <DuelCard />
        <StationPath />
        <Separator />
        <ClockCard />
        <Separator />
        <LevelShelf />
      </main>

      {/* Stats summary - clickable to go to progress page */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: spacing[8],
          textAlign: 'center',
        }}
      >
        <motion.button
          data-home-stats
          onClick={() => navigate('/progress')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: spacing[3],
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              margin: 0,
            }}
          >
            {stats.totalAttempts > 0 ? (
              <>
                <StarIcon /> {stats.lettersLearned} אותיות נלמדו | <TargetIcon />{' '}
                {Math.round(stats.accuracy * 100)}% דיוק
              </>
            ) : (
              <><ChartIcon /> צפה בהתקדמות</>
            )}
          </p>
          <p
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.xs,
              color: colors.primary[500],
              margin: 0,
              marginTop: spacing[1],
            }}
          >
            לחץ לצפייה בהישגים ←
          </p>
        </motion.button>
      </motion.div>
    </div>
  )
}
