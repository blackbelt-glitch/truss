import { Theme } from '@react-navigation/native';

// Design tokens — matches the mockup you approved
export const colors = {
  // Backgrounds
  bg: '#0A0A0A',
  surface: '#141414',
  surface2: '#1C1C1C',
  
  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.16)',
  
  // Text
  text: '#FAFAFA',
  textDim: '#71717A',
  textDimmer: '#52525B',
  
  // Accent — amber/orange (construction hardhat vibe)
  accent: '#F59E0B',
  accent2: '#EA580C',
  accentGlow: 'rgba(245, 158, 11, 0.15)',
  
  // Semantic
  green: '#22C55E',
  blue: '#3B82F6',
  red: '#EF4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 16,
  xl: 24,
  pill: 100,
};

export const typography = {
  // Inter with tight tracking — your preferred aesthetic
  fontFamily: 'Inter',
  headline: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  mono: {
    fontSize: 22,
    fontWeight: '500',
    fontVariant: ['tabular-nums'] as any,
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};
