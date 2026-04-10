// ROForest Design System — Color Tokens
// Source: tasks/mobile-design-system.md

export const Colors = {
  // Core palette
  bg: '#080808',
  bgSoft: '#111111',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  border: 'rgba(255,255,255,0.08)',
  borderSubtle: 'rgba(255,255,255,0.04)',

  // Text
  text: '#F4F4F1',
  textSecondary: 'rgba(255,255,255,0.66)',
  textMuted: 'rgba(255,255,255,0.40)',
  textStrong: 'rgba(255,255,255,0.82)',

  // Accent
  primary: '#CCFF00',
  primarySoft: 'rgba(191,255,0,0.10)',
  primaryBorder: 'rgba(191,255,0,0.15)',
  primaryMuted: 'rgba(191,255,0,0.05)',

  // Semantic
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Overlay
  elevate1: 'rgba(204,255,0,0.05)',
  elevate2: 'rgba(204,255,0,0.12)',
  scrim: 'rgba(0,0,0,0.60)',
  scrimLight: 'rgba(0,0,0,0.30)',
} as const;

// Status-specific colors (auction states)
export const StatusColors = {
  active: {
    bg: 'rgba(34,197,94,0.10)',
    text: '#22C55E',
    border: 'rgba(34,197,94,0.30)',
  },
  upcoming: {
    bg: 'rgba(245,158,11,0.10)',
    text: '#F59E0B',
    border: 'rgba(245,158,11,0.30)',
  },
  ended: {
    bg: 'rgba(255,255,255,0.05)',
    text: 'rgba(255,255,255,0.50)',
    border: 'rgba(255,255,255,0.10)',
  },
  sold: {
    bg: 'rgba(191,255,0,0.10)',
    text: '#CCFF00',
    border: 'rgba(191,255,0,0.30)',
  },
  draft: {
    bg: 'rgba(255,255,255,0.05)',
    text: 'rgba(255,255,255,0.40)',
    border: 'rgba(255,255,255,0.08)',
  },
} as const;

// Chart palette (5 colors)
export const ChartColors = [
  '#CCFF00', // Primary species (Molid)
  '#FFA500', // Secondary (Fag)
  '#20B2AA', // Tertiary (Brad)
  '#D6AAFF', // Quaternary (Stejar)
  '#FF5F5F', // Quinary (Pin)
] as const;

// Species colors for tags and bars
export const SpeciesColors: Record<string, string> = {
  'Molid': '#228B22',
  'Brad': '#2F4F2F',
  'Fag': '#DEB887',
  'Stejar pedunculat': '#8B4513',
  'Stejar brumăriu': '#8B4513',
  'Gorun': '#A0522D',
  'Pin silvestru': '#556B2F',
  'Pin negru': '#556B2F',
  'Carpen': '#CD853F',
  'Frasin': '#B8B8B8',
  'Paltin de câmp': '#FF8C00',
  'Paltin de munte': '#FF8C00',
  'Tei argintiu': '#FFD700',
  'Tei cu frunze mari': '#FFD700',
  'Salcâm': '#DAA520',
  'Anin alb': '#F08080',
  'Anin negru': '#F08080',
  'Mesteacăn': '#F5F5DC',
  'Plop tremurător': '#98FB98',
  'Plop alb': '#98FB98',
  'Plop negru': '#98FB98',
  'Larice': '#006400',
  'Cireș sălbatic': '#DC143C',
  'Tisă': '#2E8B57',
  'Nuc': '#654321',
  'Ulm de câmp': '#BC8F8F',
  'Ulm de munte': '#BC8F8F',
  'Zâmbru': '#006400',
  'Cer': '#A0522D',
  'Jugastru': '#CD853F',
  'Salcie albă': '#98FB98',
  'Castanul': '#8B4513',
  'Măr sălbatic': '#DC143C',
  'Păr sălbatic': '#DAA520',
  'Sorb de munte': '#F08080',
  'Altele': '#9CA3AF',
};
