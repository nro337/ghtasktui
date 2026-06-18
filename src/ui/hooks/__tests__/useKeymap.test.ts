import { describe, it, expect } from 'vitest';
import { matchKey, keyLabel, DEFAULT_KEYMAP, type KeyBinding } from '../useKeymap.js';
import type { Key } from 'ink';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal Ink Key object — all flags default to false. */
function key(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    ...overrides,
  };
}

function binding(overrides: Partial<KeyBinding>): KeyBinding {
  return {
    key: 'a',
    description: 'test',
    group: 'global',
    ...overrides,
  };
}

// ─── matchKey — named keys ────────────────────────────────────────────────────

describe('matchKey — return key', () => {
  it('matches when key.return and binding.key is "return"', () => {
    expect(matchKey('', key({ return: true }), binding({ key: 'return' }))).toBe(true);
  });

  it('does not match return when binding.ctrl is true', () => {
    expect(matchKey('', key({ return: true }), binding({ key: 'return', ctrl: true }))).toBe(false);
  });

  it('does not match return when key.return is false', () => {
    expect(matchKey('', key({ return: false }), binding({ key: 'return' }))).toBe(false);
  });
});

describe('matchKey — escape key', () => {
  it('matches when key.escape and binding.key is "escape"', () => {
    expect(matchKey('', key({ escape: true }), binding({ key: 'escape' }))).toBe(true);
  });

  it('does not match escape when binding.ctrl is true', () => {
    expect(matchKey('', key({ escape: true }), binding({ key: 'escape', ctrl: true }))).toBe(false);
  });
});

describe('matchKey — tab key', () => {
  it('matches when key.tab and no modifiers on binding', () => {
    expect(matchKey('', key({ tab: true }), binding({ key: 'tab' }))).toBe(true);
  });

  it('does not match tab when binding.shift is true', () => {
    expect(matchKey('', key({ tab: true }), binding({ key: 'tab', shift: true }))).toBe(false);
  });

  it('does not match tab when binding.ctrl is true', () => {
    expect(matchKey('', key({ tab: true }), binding({ key: 'tab', ctrl: true }))).toBe(false);
  });
});

describe('matchKey — backspace key', () => {
  it('matches when key.backspace and binding.key is "backspace"', () => {
    expect(matchKey('', key({ backspace: true }), binding({ key: 'backspace' }))).toBe(true);
  });

  it('does not match backspace when binding.ctrl is true', () => {
    expect(matchKey('', key({ backspace: true }), binding({ key: 'backspace', ctrl: true }))).toBe(false);
  });
});

// ─── matchKey — character keys ────────────────────────────────────────────────

describe('matchKey — character keys', () => {
  it('matches a plain character key', () => {
    expect(matchKey('q', key(), binding({ key: 'q' }))).toBe(true);
  });

  it('does not match a different character', () => {
    expect(matchKey('x', key(), binding({ key: 'q' }))).toBe(false);
  });

  it('matches Ctrl+K', () => {
    expect(matchKey('k', key({ ctrl: true }), binding({ key: 'k', ctrl: true }))).toBe(true);
  });

  it('does not match K without ctrl when binding expects ctrl', () => {
    expect(matchKey('k', key({ ctrl: false }), binding({ key: 'k', ctrl: true }))).toBe(false);
  });

  it('does not match Ctrl+K when binding has no ctrl', () => {
    expect(matchKey('k', key({ ctrl: true }), binding({ key: 'k' }))).toBe(false);
  });

  it('lowercases input before comparing', () => {
    expect(matchKey('K', key(), binding({ key: 'k' }))).toBe(true);
  });

  it('matches Ctrl+Shift+K', () => {
    expect(
      matchKey('k', key({ ctrl: true, shift: true }), binding({ key: 'k', ctrl: true, shift: true })),
    ).toBe(true);
  });

  it('does not match when shift differs', () => {
    expect(
      matchKey('k', key({ shift: true }), binding({ key: 'k', shift: false })),
    ).toBe(false);
  });

  it('matches meta modifier', () => {
    expect(matchKey('k', key({ meta: true }), binding({ key: 'k', meta: true }))).toBe(true);
  });

  it('does not match when meta differs', () => {
    expect(matchKey('k', key({ meta: false }), binding({ key: 'k', meta: true }))).toBe(false);
  });
});

// ─── matchKey — DEFAULT_KEYMAP spot checks ───────────────────────────────────

describe('matchKey — against DEFAULT_KEYMAP bindings', () => {
  it('commandPalette matches Ctrl+K', () => {
    expect(matchKey('k', key({ ctrl: true }), DEFAULT_KEYMAP.commandPalette)).toBe(true);
  });

  it('commandPalette does not match plain K', () => {
    expect(matchKey('k', key(), DEFAULT_KEYMAP.commandPalette)).toBe(false);
  });

  it('quit matches q', () => {
    expect(matchKey('q', key(), DEFAULT_KEYMAP.quit)).toBe(true);
  });

  it('back matches escape', () => {
    expect(matchKey('', key({ escape: true }), DEFAULT_KEYMAP.back)).toBe(true);
  });

  it('openItem matches return', () => {
    expect(matchKey('', key({ return: true }), DEFAULT_KEYMAP.openItem)).toBe(true);
  });
});

// ─── keyLabel ─────────────────────────────────────────────────────────────────

describe('keyLabel', () => {
  it('returns uppercase letter for plain character key', () => {
    expect(keyLabel(binding({ key: 'q' }))).toBe('Q');
  });

  it('returns Ctrl+<KEY> for ctrl binding', () => {
    expect(keyLabel(binding({ key: 'k', ctrl: true }))).toBe('Ctrl+K');
  });

  it('returns Shift+<KEY> for shift binding', () => {
    expect(keyLabel(binding({ key: 'k', shift: true }))).toBe('Shift+K');
  });

  it('stacks Ctrl+Shift+<KEY>', () => {
    expect(keyLabel(binding({ key: 'k', ctrl: true, shift: true }))).toBe('Ctrl+Shift+K');
  });

  it('returns Alt+<KEY> for meta binding', () => {
    expect(keyLabel(binding({ key: 'k', meta: true }))).toBe('Alt+K');
  });

  it('returns Enter for return key', () => {
    expect(keyLabel(binding({ key: 'return' }))).toBe('Enter');
  });

  it('returns Esc for escape key', () => {
    expect(keyLabel(binding({ key: 'escape' }))).toBe('Esc');
  });

  it('returns Tab for tab key', () => {
    expect(keyLabel(binding({ key: 'tab' }))).toBe('Tab');
  });

  it('returns Bspc for backspace key', () => {
    expect(keyLabel(binding({ key: 'backspace' }))).toBe('Bspc');
  });

  it('returns Space for space key', () => {
    expect(keyLabel(binding({ key: 'space' }))).toBe('Space');
  });

  it('renders symbol keys as-is uppercased', () => {
    expect(keyLabel(binding({ key: '/' }))).toBe('/');
    expect(keyLabel(binding({ key: '?' }))).toBe('?');
    expect(keyLabel(binding({ key: '[' }))).toBe('[');
  });
});

// ─── DEFAULT_KEYMAP structure ─────────────────────────────────────────────────

describe('DEFAULT_KEYMAP', () => {
  it('commandPalette has ctrl: true', () => {
    expect(DEFAULT_KEYMAP.commandPalette.ctrl).toBe(true);
  });

  it('all bindings have non-empty description', () => {
    for (const [name, b] of Object.entries(DEFAULT_KEYMAP)) {
      expect(b.description.length, `${name} missing description`).toBeGreaterThan(0);
    }
  });

  it('all bindings have a valid group', () => {
    const validGroups = new Set(['global', 'navigation', 'item', 'view']);
    for (const [name, b] of Object.entries(DEFAULT_KEYMAP)) {
      expect(validGroups.has(b.group), `${name} has invalid group "${b.group}"`).toBe(true);
    }
  });
});

// ─── config override logic (mirrors useKeymap internals) ─────────────────────

describe('useKeymap override logic', () => {
  function applyOverrides(overrides: Record<string, string>) {
    if (Object.keys(overrides).length === 0) return DEFAULT_KEYMAP;
    const merged = { ...DEFAULT_KEYMAP } as Record<string, KeyBinding>;
    for (const [action, newKey] of Object.entries(overrides)) {
      if (action in merged && merged[action]) {
        merged[action] = { ...merged[action]!, key: newKey };
      }
    }
    return merged as typeof DEFAULT_KEYMAP;
  }

  it('returns DEFAULT_KEYMAP reference when no overrides', () => {
    expect(applyOverrides({})).toBe(DEFAULT_KEYMAP);
  });

  it('overrides only the key property, preserves description', () => {
    const result = applyOverrides({ quit: 'x' });
    expect(result.quit.key).toBe('x');
    expect(result.quit.description).toBe(DEFAULT_KEYMAP.quit.description);
  });

  it('does not mutate DEFAULT_KEYMAP when overriding', () => {
    applyOverrides({ quit: 'x' });
    expect(DEFAULT_KEYMAP.quit.key).toBe('q');
  });

  it('ignores unknown action names without throwing', () => {
    expect(() => applyOverrides({ nonExistentAction: 'z' })).not.toThrow();
  });

  it('can override multiple actions', () => {
    const result = applyOverrides({ quit: 'x', help: 'h' });
    expect(result.quit.key).toBe('x');
    expect(result.help.key).toBe('h');
    expect(result.newItem.key).toBe(DEFAULT_KEYMAP.newItem.key);
  });
});
