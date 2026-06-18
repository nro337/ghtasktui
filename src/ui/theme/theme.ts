import chalk from 'chalk';

export const colors = {
  background:        '#0F0F0F',
  surface:           '#161616',
  border:            '#282828',
  borderFocus:       '#3E3E3E',
  textPrimary:       '#E8E8E8',
  textSecondary:     '#8B8B8B',
  textMuted:         '#525252',
  accentPurple:      '#7C3AED',
  accentPurpleLight: '#8B5CF6',
  statusTodo:        '#4B5563',
  statusInProgress:  '#6366F1',
  statusDone:        '#10B981',
  statusCanceled:    '#6B7280',
  priorityUrgent:    '#EF4444',
  priorityHigh:      '#F97316',
  priorityMedium:    '#EAB308',
  priorityLow:       '#6B7280',
  success:           '#10B981',
  warning:           '#EAB308',
  error:             '#EF4444',
  info:              '#6366F1',
} as const;

export type ColorToken = keyof typeof colors;

// Pre-built chalk instances — use these for non-JSX string coloring
export const c = {
  primary:     chalk.hex(colors.textPrimary),
  secondary:   chalk.hex(colors.textSecondary),
  muted:       chalk.hex(colors.textMuted),
  accent:      chalk.hex(colors.accentPurple),
  accentLight: chalk.hex(colors.accentPurpleLight),
  border:      chalk.hex(colors.border),
  success:     chalk.hex(colors.success),
  error:       chalk.hex(colors.error),
  warning:     chalk.hex(colors.warning),
  info:        chalk.hex(colors.info),
  urgentBg:    chalk.bgHex(colors.priorityUrgent).hex('#fff'),
  dim:         chalk.hex(colors.textMuted).dim,
} as const;

// Status color map — index by option name (case-insensitive match at call site)
export const statusColors: Record<string, string> = {
  todo:        colors.statusTodo,
  'in progress': colors.statusInProgress,
  done:        colors.statusDone,
  canceled:    colors.statusCanceled,
  cancelled:   colors.statusCanceled,
};

export const priorityColors: Record<string, string> = {
  urgent: colors.priorityUrgent,
  high:   colors.priorityHigh,
  medium: colors.priorityMedium,
  low:    colors.priorityLow,
  none:   colors.textMuted,
};

export function toastColor(kind: 'info' | 'success' | 'error'): string {
  switch (kind) {
    case 'success': return colors.success;
    case 'error':   return colors.error;
    case 'info':    return colors.info;
  }
}
