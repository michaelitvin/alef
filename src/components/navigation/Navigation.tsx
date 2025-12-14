import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { colors, typography, shadows, spacing, zIndex, borderRadius } from '../../styles/theme'
import { useResponsive } from '../../hooks/useResponsive'
import { useProgressStore } from '../../stores/progressStore'

interface NavItem {
  id: string
  path: string
  label: string
  icon: string
  levelId?: 'letters' | 'nikkud' | 'words' | 'sentences'
}

const navItems: NavItem[] = [
  { id: 'home', path: '/', label: 'בית', icon: '🏠' },
  { id: 'letters', path: '/letters', label: 'אותיות', icon: 'א', levelId: 'letters' },
  { id: 'nikkud', path: '/nikkud', label: 'ניקוד', icon: 'בָ', levelId: 'nikkud' },
  { id: 'words', path: '/words', label: 'מילים', icon: '📖', levelId: 'words' },
  { id: 'sentences', path: '/sentences', label: 'משפטים', icon: '📝', levelId: 'sentences' },
  { id: 'progress', path: '/progress', label: 'התקדמות', icon: '⭐' },
]

/**
 * Navigation component - responsive bottom nav (mobile/tablet) or sidebar (desktop)
 */
export function Navigation() {
  const { isMobile, isTablet } = useResponsive()
  const location = useLocation()
  const isLevelUnlocked = useProgressStore((state) => state.isLevelUnlocked)

  // Mobile/tablet: bottom navigation
  if (isMobile || isTablet) {
    return (
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
          padding: `${spacing[2]} ${spacing[2]} calc(${spacing[2]} + env(safe-area-inset-bottom, 0))`,
          zIndex: zIndex.sticky,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const isLocked = item.levelId ? !isLevelUnlocked(item.levelId) : false

          return (
            <NavButton
              key={item.id}
              item={item}
              isActive={isActive}
              isLocked={isLocked}
              compact={isMobile}
            />
          )
        })}
      </nav>
    )
  }

  // Desktop: sidebar navigation
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '200px',
        backgroundColor: colors.surface,
        boxShadow: shadows.lg,
        padding: spacing[4],
        zIndex: zIndex.sticky,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[2],
      }}
    >
      <div
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.primary[600],
          textAlign: 'center',
          marginBottom: spacing[4],
        }}
      >
        אָלֶף
      </div>

      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        const isLocked = item.levelId ? !isLevelUnlocked(item.levelId) : false

        return (
          <NavButton
            key={item.id}
            item={item}
            isActive={isActive}
            isLocked={isLocked}
            compact={false}
            sidebar
          />
        )
      })}
    </nav>
  )
}

interface NavButtonProps {
  item: NavItem
  isActive: boolean
  isLocked: boolean
  compact?: boolean
  sidebar?: boolean
}

function NavButton({ item, isActive, isLocked, compact = false, sidebar = false }: NavButtonProps) {
  const content = (
    <motion.div
      whileHover={isLocked ? {} : { scale: 1.05 }}
      whileTap={isLocked ? {} : { scale: 0.95 }}
      style={{
        display: 'flex',
        flexDirection: sidebar ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: sidebar ? 'flex-start' : 'center',
        gap: sidebar ? spacing[3] : spacing[1],
        padding: sidebar ? `${spacing[3]} ${spacing[4]}` : `${spacing[1]} ${spacing[2]}`,
        borderRadius: borderRadius.lg,
        backgroundColor: isActive ? colors.primary[50] : 'transparent',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.5 : 1,
        minWidth: compact ? '44px' : '60px',
        minHeight: '44px',
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          fontSize: sidebar ? typography.fontSize.xl : compact ? typography.fontSize.lg : typography.fontSize['2xl'],
          lineHeight: 1,
        }}
      >
        {isLocked ? '🔒' : item.icon}
      </span>
      {!compact && (
        <span
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: sidebar ? typography.fontSize.base : typography.fontSize.xs,
            color: isActive ? colors.primary[600] : colors.text.secondary,
            fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
          }}
        >
          {item.label}
        </span>
      )}
    </motion.div>
  )

  if (isLocked) {
    return <div>{content}</div>
  }

  return <Link to={item.path} style={{ textDecoration: 'none' }}>{content}</Link>
}

/**
 * Header component for pages
 */
export interface HeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  rightContent?: React.ReactNode
}

export function Header({ title, subtitle, showBack, onBack, rightContent }: HeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing[4]} ${spacing[4]}`,
        paddingTop: `calc(${spacing[4]} + env(safe-area-inset-top, 0))`,
        backgroundColor: colors.surface,
        boxShadow: shadows.sm,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
        {showBack && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: typography.fontSize['2xl'],
              padding: spacing[2],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            →
          </motion.button>
        )}
        <div>
          <h1
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontFamily: typography.fontFamily.hebrew,
                fontSize: typography.fontSize.base,
                color: colors.text.secondary,
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {rightContent}
    </header>
  )
}

export default Navigation
