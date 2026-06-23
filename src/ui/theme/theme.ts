import chalk from 'chalk';

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

// Pre-built chalk instances — use these for non-JSX string coloring
function buildChalk(p: Palette) {
  return {
    primary: chalk.hex(p.textPrimary),
    secondary: chalk.hex(p.textSecondary),
    muted: chalk.hex(p.textMuted),
    accent: chalk.hex(p.accentPurple),
    accentLight: chalk.hex(p.accentPurpleLight),
    border: chalk.hex(p.border),
    success: chalk.hex(p.success),
    error: chalk.hex(p.error),
    warning: chalk.hex(p.warning),
    info: chalk.hex(p.info),
    urgentBg: chalk.bgHex(p.priorityUrgent).hex('#fff'),
    dim: chalk.hex(p.textMuted).dim,
  } as const;
}

export let c = buildChalk(colors);

// Status color map — index by option name (case-insensitive match at call site)
function buildStatusColors(p: Palette): Record<string, string> {
  return {
    todo: p.statusTodo,
    'in progress': p.statusInProgress,
    done: p.statusDone,
    canceled: p.statusCanceled,
    cancelled: p.statusCanceled,
  };
}

export let statusColors: Record<string, string> = buildStatusColors(colors);

function buildPriorityColors(p: Palette): Record<string, string> {
  return {
    urgent: p.priorityUrgent,
    high: p.priorityHigh,
    medium: p.priorityMedium,
    low: p.priorityLow,
    none: p.textMuted,
  };
}

export let priorityColors: Record<string, string> = buildPriorityColors(colors);

export function initTheme(opts: { theme: 'dark' | 'midnight'; highContrastText: boolean }) {
  Object.assign(colors, paletteFor(opts.theme, opts.highContrastText));
  c = buildChalk(colors);
  statusColors = buildStatusColors(colors);
  priorityColors = buildPriorityColors(colors);
}

export function toastColor(kind: 'info' | 'success' | 'error'): string {
  switch (kind) {
    case 'success': return colors.success;
    case 'error':   return colors.error;
    case 'info':    return colors.info;
  }
}
