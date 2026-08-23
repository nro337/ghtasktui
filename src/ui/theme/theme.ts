type Palette = {
  background: string;
  surface: string;
  border: string;
  borderFocus: string;
  focusBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPurple: string;
  accentPurpleLight: string;
  statusTodo: string;
  statusInProgress: string;
  statusDone: string;
  statusCanceled: string;
  priorityUrgent: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  success: string;
  warning: string;
  error: string;
  info: string;
};

export type ThemeName = 'dark' | 'midnight' | 'light' | 'solarized';

export const THEME_NAMES: ThemeName[] = ['dark', 'midnight', 'light', 'solarized'];

export const THEME_LABELS: Record<ThemeName, string> = {
  dark: 'Dark',
  midnight: 'Midnight',
  light: 'Light',
  solarized: 'Solarized',
};

interface ThemeDef {
  base: Palette;
  // Overrides applied on top of `base` when high-contrast mode is on. Values
  // are theme-specific because "boost contrast" means lighter on a dark
  // background but darker on a light one.
  highContrast: Partial<Palette>;
}

const themes: Record<ThemeName, ThemeDef> = {
  dark: {
    base: {
      background: '#0F0F0F',
      surface: '#161616',
      border: '#282828',
      borderFocus: '#6D28D9',
      focusBg: '#231336',
      textPrimary: '#E8E8E8',
      textSecondary: '#8B8B8B',
      textMuted: '#525252',
      accentPurple: '#7C3AED',
      accentPurpleLight: '#8B5CF6',
      statusTodo: '#4B5563',
      statusInProgress: '#6366F1',
      statusDone: '#10B981',
      statusCanceled: '#6B7280',
      priorityUrgent: '#EF4444',
      priorityHigh: '#F97316',
      priorityMedium: '#EAB308',
      priorityLow: '#6B7280',
      success: '#10B981',
      warning: '#EAB308',
      error: '#EF4444',
      info: '#6366F1',
    },
    highContrast: {
      textSecondary: '#D4D4D4',
      textMuted: '#B3B3B3',
      border: '#4A4A4A',
      statusCanceled: '#9CA3AF',
      priorityLow: '#9CA3AF',
    },
  },
  midnight: {
    base: {
      background: '#0A0F1F',
      surface: '#11182D',
      border: '#1E293B',
      borderFocus: '#3B82F6',
      focusBg: '#1F3052',
      textPrimary: '#E6EDF7',
      textSecondary: '#8B98AC',
      textMuted: '#525C70',
      accentPurple: '#3B82F6',
      accentPurpleLight: '#60A5FA',
      statusTodo: '#64748B',
      statusInProgress: '#60A5FA',
      statusDone: '#22C55E',
      statusCanceled: '#94A3B8',
      priorityUrgent: '#EF4444',
      priorityHigh: '#F97316',
      priorityMedium: '#EAB308',
      priorityLow: '#94A3B8',
      success: '#22C55E',
      warning: '#EAB308',
      error: '#EF4444',
      info: '#60A5FA',
    },
    highContrast: {
      textSecondary: '#D6E0F0',
      textMuted: '#B0BDD4',
      border: '#3D4B63',
      statusCanceled: '#CBD5E1',
      priorityLow: '#CBD5E1',
    },
  },
  light: {
    base: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      border: '#D4D4D4',
      borderFocus: '#7C3AED',
      focusBg: '#EDE9FE',
      textPrimary: '#1A1A1A',
      textSecondary: '#595959',
      textMuted: '#8A8A8A',
      accentPurple: '#7C3AED',
      accentPurpleLight: '#6D28D9',
      statusTodo: '#9CA3AF',
      statusInProgress: '#6366F1',
      statusDone: '#059669',
      statusCanceled: '#9CA3AF',
      priorityUrgent: '#DC2626',
      priorityHigh: '#EA580C',
      priorityMedium: '#CA8A04',
      priorityLow: '#9CA3AF',
      success: '#059669',
      warning: '#CA8A04',
      error: '#DC2626',
      info: '#6366F1',
    },
    highContrast: {
      textSecondary: '#262626',
      textMuted: '#404040',
      border: '#8A8A8A',
      statusCanceled: '#525252',
      priorityLow: '#525252',
    },
  },
  solarized: {
    base: {
      background: '#002B36',
      surface: '#073642',
      border: '#586E75',
      borderFocus: '#268BD2',
      focusBg: '#0B4F5C',
      textPrimary: '#EEE8D5',
      textSecondary: '#93A1A1',
      textMuted: '#657B83',
      accentPurple: '#6C71C4',
      accentPurpleLight: '#8A8FE0',
      statusTodo: '#586E75',
      statusInProgress: '#268BD2',
      statusDone: '#859900',
      statusCanceled: '#657B83',
      priorityUrgent: '#DC322F',
      priorityHigh: '#CB4B16',
      priorityMedium: '#B58900',
      priorityLow: '#657B83',
      success: '#859900',
      warning: '#B58900',
      error: '#DC322F',
      info: '#268BD2',
    },
    highContrast: {
      textSecondary: '#FDF6E3',
      textMuted: '#CBB89D',
      border: '#839496',
      statusCanceled: '#93A1A1',
      priorityLow: '#93A1A1',
    },
  },
};

function paletteFor(theme: ThemeName, highContrast: boolean): Palette {
  const def = themes[theme];
  return highContrast ? { ...def.base, ...def.highContrast } : { ...def.base };
}

export const colors: Palette = paletteFor('dark', false);

export type ColorToken = keyof typeof colors;

export function initTheme(opts: { theme: ThemeName; highContrastText: boolean }) {
  Object.assign(colors, paletteFor(opts.theme, opts.highContrastText));
}

export function statusColor(name: string | undefined): string {
  switch (name?.toLowerCase()) {
    case 'todo': return colors.statusTodo;
    case 'in progress': return colors.statusInProgress;
    case 'done': return colors.statusDone;
    case 'canceled':
    case 'cancelled':
      return colors.statusCanceled;
    default:
      return colors.textSecondary;
  }
}

export function priorityColor(name: string | undefined): string {
  switch (name?.toLowerCase()) {
    case 'urgent': return colors.priorityUrgent;
    case 'high': return colors.priorityHigh;
    case 'medium': return colors.priorityMedium;
    case 'low': return colors.priorityLow;
    case 'none': return colors.textMuted;
    default:
      return colors.textMuted;
  }
}

export function toastColor(kind: 'info' | 'success' | 'error'): string {
  switch (kind) {
    case 'success': return colors.success;
    case 'error':   return colors.error;
    case 'info':    return colors.info;
  }
}
