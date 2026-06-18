export interface IconSet {
  // App
  app: string;
  // Item types
  issue: string;
  pullRequest: string;
  draftIssue: string;
  // Status
  todo: string;
  inProgress: string;
  done: string;
  canceled: string;
  // Priority
  urgent: string;
  high: string;
  medium: string;
  low: string;
  noPriority: string;
  // Navigation
  arrowRight: string;
  arrowDown: string;
  chevronRight: string;
  chevronDown: string;
  // UI
  loading: string;
  search: string;
  settings: string;
  project: string;
  board: string;
  list: string;
  detail: string;
  // Separator
  dot: string;
}

const unicode: IconSet = {
  app:          '◈',
  issue:        '◉',
  pullRequest:  '⤢',
  draftIssue:   '○',
  todo:         '○',
  inProgress:   '◑',
  done:         '✓',
  canceled:     '✗',
  urgent:       '↑↑',
  high:         '↑',
  medium:       '→',
  low:          '↓',
  noPriority:   '·',
  arrowRight:   '▶',
  arrowDown:    '▼',
  chevronRight: '›',
  chevronDown:  '⌄',
  loading:      '…',
  search:       '/',
  settings:     '⚙',
  project:      '◈',
  board:        '▦',
  list:         '≡',
  detail:       '⊞',
  dot:          '·',
};

const nerd: IconSet = {
  app:          '\uDB82\uDDB3', // nf-oct-mark_github
  issue:        '\uF41B',       // nf-fa-exclamation_circle
  pullRequest:  '\uF407',       // nf-fa-code_fork
  draftIssue:   '\uF044',       // nf-fa-pencil_square_o
  todo:         '\uF111',       // nf-fa-circle_o
  inProgress:   '\uF110',       // nf-fa-spinner
  done:         '\uF00C',       // nf-fa-check
  canceled:     '\uF00D',       // nf-fa-times
  urgent:       '\uF062\uF062', // double up arrow
  high:         '\uF062',       // nf-fa-arrow_up
  medium:       '\uF061',       // nf-fa-arrow_right
  low:          '\uF063',       // nf-fa-arrow_down
  noPriority:   '\uF10C',       // nf-fa-circle_o (empty)
  arrowRight:   '\uE0B0',       // nf-pl-right_hard_divider
  arrowDown:    '\uE0B2',       // nf-pl-left_hard_divider
  chevronRight: '\uE0B1',       // nf-pl-right_soft_divider
  chevronDown:  '\uF078',       // nf-fa-chevron_down
  loading:      '\uF110',       // nf-fa-spinner
  search:       '\uF002',       // nf-fa-search
  settings:     '\uF013',       // nf-fa-cog
  project:      '\uF07B',       // nf-fa-folder
  board:        '\uF009',       // nf-fa-th
  list:         '\uF03A',       // nf-fa-list
  detail:       '\uF15C',       // nf-fa-file_text
  dot:          '\uF111',       // nf-fa-circle (small)
};

export function getIcons(nerdFonts: boolean): IconSet {
  return nerdFonts ? nerd : unicode;
}

// Spinner frames for loading animation
export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;
