import type { Key } from 'ink';
import { useAppState } from './useAppState.js';

export interface KeyBinding {
  /** The character key (lowercase). Use 'return', 'escape', 'tab', 'space', 'backspace'. */
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  /** Which section to group under in the Help overlay */
  group: 'global' | 'navigation' | 'item' | 'view';
}

export const DEFAULT_KEYMAP = {
  commandPalette: { key: 'k',      ctrl: true,  description: 'Command palette',          group: 'global'     },
  help:           { key: '?',                   description: 'Show help',                group: 'global'     },
  quit:           { key: 'q',                   description: 'Quit',                     group: 'global'     },
  toggleSidebar:  { key: 'b',                   description: 'Toggle sidebar',           group: 'global'     },
  refresh:        { key: 'r',      ctrl: true,  description: 'Refresh from gh',          group: 'global'     },
  toggleView:     { key: 'v',                   description: 'Toggle list / board view', group: 'view'       },
  prevProject:    { key: '[',                   description: 'Previous project',         group: 'navigation' },
  nextProject:    { key: ']',                   description: 'Next project',             group: 'navigation' },
  back:           { key: 'escape',              description: 'Close / go back',          group: 'navigation' },
  newItem:        { key: 'n',                   description: 'New item',                 group: 'item'       },
  editItem:       { key: 'e',                   description: 'Edit selected item',       group: 'item'       },
  deleteItem:     { key: 'd',                   description: 'Delete item',              group: 'item'       },
  openItem:       { key: 'return',              description: 'Open item detail',         group: 'item'       },
  openBrowser:    { key: 'o',                   description: 'Open in browser',          group: 'item'       },
  changeStatus:   { key: 's',                   description: 'Change status',            group: 'item'       },
  changePriority: { key: 'p',                   description: 'Change priority',          group: 'item'       },
  changeAssignee: { key: 'a',                   description: 'Change assignee',          group: 'item'       },
  changeLabels:   { key: 'l',                   description: 'Change labels',            group: 'item'       },
  filter:         { key: 'f',                   description: 'Filter items',             group: 'view'       },
  search:         { key: '/',                   description: 'Search items',             group: 'view'       },
} as const satisfies Record<string, KeyBinding>;

export type KeymapKey = keyof typeof DEFAULT_KEYMAP;
export type Keymap = typeof DEFAULT_KEYMAP;

/** Check if a key event matches a binding. */
export function matchKey(
  input: string,
  key: Key,
  binding: KeyBinding,
): boolean {
  const inputKey = input.toLowerCase();

  // Handle named keys
  if (binding.key === 'return'    && key.return)    return !binding.ctrl;
  if (binding.key === 'escape'    && key.escape)    return !binding.ctrl;
  if (binding.key === 'tab'       && key.tab)       return !binding.shift && !binding.ctrl;
  if (binding.key === 'backspace' && key.backspace) return !binding.ctrl;

  const ctrlMatch  = (binding.ctrl  ?? false) === key.ctrl;
  const shiftMatch = (binding.shift ?? false) === key.shift;
  const metaMatch  = (binding.meta  ?? false) === key.meta;

  return ctrlMatch && shiftMatch && metaMatch && inputKey === binding.key;
}

/** Returns the display label for a binding, e.g. "Ctrl+K" or "?" */
export function keyLabel(binding: KeyBinding): string {
  const parts: string[] = [];
  if (binding.ctrl)  parts.push('Ctrl');
  if (binding.shift) parts.push('Shift');
  if (binding.meta)  parts.push('Alt');

  const name =
    binding.key === 'return'    ? 'Enter'  :
    binding.key === 'escape'    ? 'Esc'    :
    binding.key === 'tab'       ? 'Tab'    :
    binding.key === 'backspace' ? 'Bspc'   :
    binding.key === 'space'     ? 'Space'  :
    binding.key.toUpperCase();

  parts.push(name);
  return parts.join('+');
}

/**
 * Returns the effective keymap with any config overrides applied.
 * Currently only key overrides are supported (description stays the same).
 */
export function useKeymap(): Keymap {
  const state = useAppState();
  const overrides = state.config.keybindings;

  if (Object.keys(overrides).length === 0) return DEFAULT_KEYMAP;

  // Apply config overrides to key property only
  const merged = { ...DEFAULT_KEYMAP } as Record<string, KeyBinding>;
  for (const [action, newKey] of Object.entries(overrides)) {
    if (action in merged && merged[action]) {
      merged[action] = { ...merged[action]!, key: newKey };
    }
  }
  return merged as Keymap;
}
