import { Link } from 'react-router-dom'
import { colors, typography, spacing, borderRadius } from '../../styles/theme'

// All letters (22 + 5 sofiyot)
const LETTERS = [
  'alef', 'bet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'chet', 'tet', 'yod',
  'kaf', 'lamed', 'mem', 'nun', 'samech', 'ayin', 'pe', 'tzadi', 'kof', 'resh',
  'shin', 'tav',
  // Sofiyot
  'kaf-sofit', 'mem-sofit', 'nun-sofit', 'pe-sofit', 'tzadi-sofit'
]

const LETTER_STEPS = ['intro', 'sound', 'trace', 'quiz', 'complete']

// All nikkud marks
const NIKKUD = [
  'kamatz', 'patach', 'tzeire', 'segol', 'chirik', 'cholam', 'kubutz', 'shva',
  'holam-male', 'shuruk'
]

const NIKKUD_STEPS = ['intro', 'quiz', 'builder', 'complete']

// Syllable drills
const SYLLABLE_DRILLS = [
  'drill-bet-all', 'drill-mem-all', 'drill-lamed-all', 'drill-shin-all',
  'drill-mixed-basic', 'blend-easy', 'segment-easy', 'pairs-consonant'
]

// Word groups (example IDs)
const WORD_GROUPS = [
  'family', 'animals', 'food', 'colors', 'numbers', 'body', 'home', 'school',
  'nature', 'actions'
]

// Sentence groups (example IDs)
const SENTENCE_GROUPS = [
  'greetings', 'family', 'daily', 'questions', 'stories'
]

interface RouteSection {
  title: string
  routes: Array<{
    path: string
    label: string
    children?: Array<{ path: string; label: string }>
  }>
}

const ROUTE_SECTIONS: RouteSection[] = [
  {
    title: 'Main Pages',
    routes: [
      { path: '/', label: 'Home' },
      { path: '/progress', label: 'Progress' },
      { path: '/settings', label: 'Settings' },
    ]
  },
  {
    title: 'Letters (אותיות)',
    routes: [
      { path: '/letters', label: 'Letters Home' },
      ...LETTERS.map(id => ({
        path: `/letters/${id}`,
        label: id,
        children: LETTER_STEPS.map(step => ({
          path: `/letters/${id}?step=${step}`,
          label: step
        }))
      }))
    ]
  },
  {
    title: 'Nikkud (ניקוד)',
    routes: [
      { path: '/nikkud', label: 'Nikkud Home' },
      ...NIKKUD.map(id => ({
        path: `/nikkud/${id}`,
        label: id,
        children: NIKKUD_STEPS.map(step => ({
          path: `/nikkud/${id}?step=${step}`,
          label: step
        }))
      }))
    ]
  },
  {
    title: 'Syllables (צירופים)',
    routes: [
      { path: '/syllables', label: 'Syllables Home' },
      ...SYLLABLE_DRILLS.map(id => ({
        path: `/syllables/${id}`,
        label: id,
      }))
    ]
  },
  {
    title: 'Words (מילים)',
    routes: [
      { path: '/words', label: 'Words Home' },
      ...WORD_GROUPS.map(id => ({
        path: `/words/${id}`,
        label: id,
      }))
    ]
  },
  {
    title: 'Sentences (משפטים)',
    routes: [
      { path: '/sentences', label: 'Sentences Home' },
      ...SENTENCE_GROUPS.map(id => ({
        path: `/sentences/${id}`,
        label: id,
      }))
    ]
  },
]

export function RoutesPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        padding: spacing[4],
      }}
    >
      <h1
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize['2xl'],
          marginBottom: spacing[4],
          color: colors.text.primary,
        }}
      >
        All Routes (Debug)
      </h1>

      <p
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          marginBottom: spacing[6],
        }}
      >
        Hidden debug page - access via <code>/debug/routes</code>
      </p>

      {ROUTE_SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: spacing[6] }}>
          <h2
            style={{
              fontFamily: typography.fontFamily.hebrew,
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.primary[600],
              marginBottom: spacing[3],
              borderBottom: `2px solid ${colors.primary[200]}`,
              paddingBottom: spacing[2],
            }}
          >
            {section.title}
          </h2>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing[2],
            }}
          >
            {section.routes.map((route) => (
              <div
                key={route.path}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.lg,
                  padding: spacing[3],
                  minWidth: '150px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <Link
                  to={route.path}
                  style={{
                    display: 'block',
                    fontFamily: 'monospace',
                    fontSize: typography.fontSize.sm,
                    color: colors.primary[600],
                    textDecoration: 'none',
                    fontWeight: typography.fontWeight.medium,
                    marginBottom: route.children ? spacing[2] : 0,
                  }}
                >
                  {route.label}
                </Link>

                {route.children && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: spacing[1],
                      paddingTop: spacing[2],
                      borderTop: `1px solid ${colors.neutral[200]}`,
                    }}
                  >
                    {route.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: typography.fontSize.xs,
                          color: colors.secondary[600],
                          textDecoration: 'none',
                          backgroundColor: colors.secondary[50],
                          padding: `${spacing[1]} ${spacing[2]}`,
                          borderRadius: borderRadius.sm,
                        }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div
        style={{
          marginTop: spacing[8],
          padding: spacing[4],
          backgroundColor: colors.neutral[100],
          borderRadius: borderRadius.lg,
        }}
      >
        <h3
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing[2],
          }}
        >
          Route Structure
        </h3>
        <pre
          style={{
            fontFamily: 'monospace',
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            whiteSpace: 'pre-wrap',
          }}
        >
{`/                         - Home
/letters                  - Letters level home
/letters/:letterId        - Letter node view
  ?step=intro|sound|trace|quiz|complete

/nikkud                   - Nikkud level home
/nikkud/:nikkudId         - Nikkud node view
  ?step=intro|quiz|builder|complete

/syllables                - Syllables level home
/syllables/:drillId       - Syllable drill view

/words                    - Words level home
/words/:groupId           - Word group view

/sentences                - Sentences level home
/sentences/:groupId       - Sentence group view

/progress                 - Progress page
/settings                 - Settings page
/debug/routes             - This page`}
        </pre>
      </div>
    </div>
  )
}

export default RoutesPage
