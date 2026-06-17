export const COLORS = {
  bg: '#000000',
  surface: '#0d0d0d',
  surface2: '#141414',
  surface3: '#1c1c1c',
  cream: '#fbfbef',
  creamDim: 'rgba(251, 251, 239, 0.6)',
  creamMuted: 'rgba(251, 251, 239, 0.2)',
  success: '#4ade80',
  warning: '#facc15',
  error: '#f87171',
  info: '#60a5fa',
  badges: {
    fashion: '#c084fc',
    tech: '#38bdf8',
    food: '#fb923c',
    fitness: '#4ade80',
    beauty: '#f472b6',
    travel: '#fbbf24',
    gaming: '#a78bfa',
    lifestyle: '#fbfbef',
  }
} as const;

export const TYPOGRAPHY = {
  sizes: {
    xs: '11px',
    sm: '13px',
    base: '15px',
    md: '17px',
    lg: '20px',
    xl: '24px',
    '2xl': '30px',
    '3xl': '38px',
    '4xl': '48px',
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.7',
  },
  letterSpacings: {
    tight: '-0.02em',
    normal: '0em',
    wide: '0.04em',
    wider: '0.08em',
  }
} as const;

export const SPACING = {
  space1: '4px',
  space2: '8px',
  space3: '12px',
  space4: '16px',
  space5: '20px',
  space6: '24px',
  space8: '32px',
  space10: '40px',
  space12: '48px',
  space16: '64px',
} as const;

export const RADIUS = {
  sm: '6px',
  md: '12px',
  lg: '18px',
  xl: '24px',
  full: '9999px',
} as const;

export const SHADOWS = {
  sm: '0 1px 3px rgba(251, 251, 239, 0.04)',
  md: '0 4px 16px rgba(251, 251, 239, 0.06)',
  lg: '0 8px 32px rgba(251, 251, 239, 0.08)',
  glow: '0 0 24px rgba(251, 251, 239, 0.12)',
} as const;

export const ANIMATION = {
  durations: {
    fast: '120ms',
    normal: '220ms',
    slow: '380ms',
  },
  eases: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.7, 0, 0.84, 0)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  }
} as const;
