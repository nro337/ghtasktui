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

const palettes: Record<'dark' | 'midnight', Omit<Palette, 'textSecondary' | 'textMuted'>> = {
  dark: {
    background: '#0F0F0F',
    surface: '#161616',
    border: '#282828',
    borderFocus: '#6D28D9',
    focusBg: '#231336',
    textPrimary: '#E8E8E8',
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
  midnight: {
    background: '#0A0F1F',
    surface: '#11182D',
    border: '#1E293B',
    borderFocus: '#3B82F6',
    focusBg: '#1F3052',
    textPrimary: '#E6EDF7',
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
};

function paletteFor(theme: 'dark' | 'midnight', highContrastText: boolean): Palette {
  const base = palettes[theme];
  return {
    ...base,
    textSecondary: highContrastText ? '#D4D4D4' : '#8B8B8B',
    textMuted: highContrastText ? '#B3B3B3' : '#525252',
  };
}

export const colors: Palette = paletteFor('dark', false);

export type ColorToken = keyof typeof colors;

export function initTheme(opts: { theme: 'dark' | 'midnight'; highContrastText: boolean }) {
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
