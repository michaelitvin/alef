// Color palette - warm, inviting colors for children
export const colors = {
  // Primary colors
  primary: {
    50: '#E8F4FD',
    100: '#C5E4F9',
    200: '#9ED2F5',
    300: '#77C0F1',
    400: '#5AB2ED',
    500: '#4A90D9', // Main primary
    600: '#3D7BC4',
    700: '#3066A8',
    800: '#25528C',
    900: '#1A3D6B',
  },
  // Secondary - warm orange for accents and celebrations
  secondary: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800', // Main secondary
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },
  // Success - green for correct answers
  success: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50', // Main success
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },
  // Error - soft red for incorrect (not scary)
  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336',
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },
  // Neutral grays
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  // Special colors
  background: '#FFF9F0', // Warm off-white
  surface: '#FFFFFF',
  text: {
    primary: '#2D3436',
    secondary: '#636E72',
    disabled: '#B2BEC3',
    inverse: '#FFFFFF',
  },
  // Reward colors
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  star: '#FFC107',
}

// Font options for Hebrew text
export const fonts = {
  default: "'Hillel CLM', 'David CLM', 'Arial Hebrew', 'Noto Sans Hebrew', sans-serif",
  cursive: "'Dana Yad', 'Guttman Yad-Brush', 'Hillel CLM', sans-serif",
  modern: "'Noto Sans Hebrew', 'Arial Hebrew', 'Heebo', sans-serif",
  rounded: "'Varela Round', 'Rubik', 'Noto Sans Hebrew', sans-serif",
} as const

export type FontKey = keyof typeof fonts

// Typography
export const typography = {
  fontFamily: {
    hebrew: fonts.default,
    hebrewCursive: fonts.cursive,
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
    letter: '6rem',   // 96px - for displaying Hebrew letters
    letterLarge: '8rem', // 128px - for letter focus
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em', // For letters with nikkud
  },
}

// Spacing scale
export const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem', // 40px
  12: '3rem',   // 48px
  16: '4rem',   // 64px
  20: '5rem',   // 80px
  24: '6rem',   // 96px
}

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  full: '9999px',
}

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  glow: '0 0 20px rgba(74, 144, 217, 0.3)',
  glowSuccess: '0 0 20px rgba(76, 175, 80, 0.3)',
  glowGold: '0 0 20px rgba(255, 215, 0, 0.5)',
}

// Transitions
export const transitions = {
  fast: '150ms ease-in-out',
  normal: '250ms ease-in-out',
  slow: '400ms ease-in-out',
  bounce: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
}

// Z-index scale
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  overlay: 40,
  tooltip: 50,
  toast: 60,
}

// Touch targets
export const touchTargets = {
  minimum: '44px',
  comfortable: '48px',
  large: '56px',
}

// Complete theme object
export const theme = {
  colors,
  fonts,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  touchTargets,
}

export type Theme = typeof theme
export default theme
