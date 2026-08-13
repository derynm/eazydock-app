/**
 * eazydock design system — tokens consumed through `useTheme()`.
 * Hand-rolled (no UI kit). Brand: #208AEF.
 */
import '@/global.css';

import { Platform } from 'react-native';

/* ------------------------------------------------------------------ *
 * Brand scale
 * ------------------------------------------------------------------ */
export const Brand = {
  50: '#EAF4FE',
  100: '#D2E7FD',
  200: '#A6CFFB',
  300: '#73B2F8',
  400: '#4A9CF4',
  500: '#208AEF', // primary
  600: '#1670CF',
  700: '#1259A6',
  800: '#0E447D',
  900: '#0B1F33', // sidebar / splash backdrop
} as const;

/* ------------------------------------------------------------------ *
 * Per-scheme palette
 * ------------------------------------------------------------------ */
export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  border: string;
  borderStrong: string;

  primary: string;
  primaryHover: string;
  primarySoft: string;
  onPrimary: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  accent: string;
  accentSoft: string;
  chartBar: string;
  neutralSoft: string;

  scrim: string;
  skeleton: string;
  focusRing: string;

  /** Sidebar is brand-dark in both schemes for a consistent identity. */
  sidebar: string;
  sidebarAlt: string;
  sidebarText: string;
  sidebarMuted: string;
  sidebarActive: string;
  sidebarBorder: string;
};

export const Colors: { light: Palette; dark: Palette } = {
  light: {
    background: '#FBFCFE',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFC',
    surfaceSunken: '#EEF1F6',

    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',

    border: '#EEF1F5',
    borderStrong: '#CBD5E1',

    primary: Brand[500],
    primaryHover: Brand[600],
    primarySoft: Brand[50],
    onPrimary: '#FFFFFF',

    success: '#15803D',
    successSoft: '#E7F6EC',
    warning: '#B45309',
    warningSoft: '#FDF1E2',
    danger: '#DC2626',
    dangerSoft: '#FDECEC',
    info: Brand[600],
    infoSoft: Brand[50],
    accent: '#7C3AED',
    accentSoft: '#F2EAFF',
    chartBar: '#3E75C9',
    neutralSoft: '#EEF1F6',

    scrim: 'rgba(8, 15, 31, 0.45)',
    skeleton: '#E8ECF2',
    focusRing: Brand[300],

    sidebar: Brand[900],
    sidebarAlt: '#10293F',
    sidebarText: '#E8EEF6',
    sidebarMuted: '#8AA0B6',
    sidebarActive: Brand[500],
    sidebarBorder: 'rgba(255,255,255,0.08)',
  },
  dark: {
    background: '#0A0E14',
    surface: '#131A24',
    surfaceAlt: '#0F151D',
    surfaceSunken: '#1B232F',

    text: '#F1F5F9',
    textSecondary: '#A8B4C4',
    textMuted: '#6B7A8D',
    textInverse: '#0A0E14',

    border: '#222C3A',
    borderStrong: '#33404F',

    primary: Brand[400],
    primaryHover: Brand[300],
    primarySoft: 'rgba(32,138,239,0.16)',
    onPrimary: '#06101D',

    success: '#34D399',
    successSoft: 'rgba(52,211,153,0.16)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251,191,36,0.16)',
    danger: '#F87171',
    dangerSoft: 'rgba(248,113,113,0.16)',
    info: Brand[300],
    infoSoft: 'rgba(32,138,239,0.16)',
    accent: '#A78BFA',
    accentSoft: 'rgba(167,139,250,0.16)',
    chartBar: '#3E75C9',
    neutralSoft: '#1B232F',

    scrim: 'rgba(0, 0, 0, 0.6)',
    skeleton: '#1B232F',
    focusRing: Brand[400],

    sidebar: '#080C12',
    sidebarAlt: '#0E1620',
    sidebarText: '#E8EEF6',
    sidebarMuted: '#75879A',
    sidebarActive: Brand[500],
    sidebarBorder: 'rgba(255,255,255,0.06)',
  },
};

/** Pastel event colors used by the phone booking calendar. */
export const BookingCalendarColors = {
  light: [
    { accent: '#2FA45A', fill: '#D9ECE5', border: '#B4D6C9' },
    { accent: '#D09A24', fill: '#F1E6C8', border: '#DFD1A8' },
    { accent: '#5B18B5', fill: '#D8D1E9', border: '#ADA0CD' },
    { accent: '#D64B38', fill: '#EAD5D6', border: '#D7B3B5' },
  ],
  dark: [
    { accent: '#43B96F', fill: 'rgba(47,164,90,0.22)', border: '#357C52' },
    { accent: '#E1AC37', fill: 'rgba(208,154,36,0.22)', border: '#866A2F' },
    { accent: '#9B7BDD', fill: 'rgba(91,24,181,0.24)', border: '#674C91' },
    { accent: '#E26A59', fill: 'rgba(214,75,56,0.22)', border: '#874B45' },
  ],
} as const;

export type ThemeColor = keyof Palette;

/* ------------------------------------------------------------------ *
 * Scale tokens
 * ------------------------------------------------------------------ */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  android: { sans: 'sans-serif', rounded: 'sans-serif-medium', mono: 'monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
})!;

/** Elevation presets (cross-platform). */
export const Shadow = {
  none: {},
  xs: Platform.select({
    ios: { shadowColor: '#0B1F33', shadowOpacity: 0.035, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
    android: { elevation: 1 },
    default: { boxShadow: '0 1px 3px rgba(11,31,51,0.035)' } as object,
  })!,
  sm: Platform.select({
    ios: { shadowColor: '#0B1F33', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 2 },
    default: { boxShadow: '0 2px 6px rgba(11,31,51,0.06)' } as object,
  })!,
  md: Platform.select({
    ios: { shadowColor: '#0B1F33', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 6 },
    default: { boxShadow: '0 8px 24px rgba(11,31,51,0.1)' } as object,
  })!,
  lg: Platform.select({
    ios: { shadowColor: '#0B1F33', shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: 16 } },
    android: { elevation: 12 },
    default: { boxShadow: '0 18px 48px rgba(11,31,51,0.18)' } as object,
  })!,
} as const;

/* ------------------------------------------------------------------ *
 * Responsive breakpoints (plan §5: ~700px phone/tablet split)
 * ------------------------------------------------------------------ */
export const Breakpoints = { tablet: 700, wide: 1100 } as const;

export const Layout = {
  sidebarWidth: 268,
  sidebarRailWidth: 76,
  headerHeight: 56,
  maxContentWidth: 1180,
  listPaneWidth: 380,
} as const;
