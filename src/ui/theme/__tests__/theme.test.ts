import { describe, it, expect } from 'vitest';
import {
  initTheme,
  colors,
  focus,
  statusColor,
  priorityColor,
  FOCUS_HIGHLIGHT_PRESETS,
  DEFAULT_FOCUS_HIGHLIGHT_COLOR,
  contrastRatio,
  parseHexColor,
  readableTextOn,
} from '../theme.js';

describe('initTheme', () => {
  it('applies dark theme defaults', () => {
    initTheme({ theme: 'dark', highContrastText: false });
    expect(colors.accentPurple).toBe('#7C3AED');
    expect(colors.textSecondary).toBe('#8B8B8B');
  });

  it('applies midnight theme with strong text contrast', () => {
    initTheme({ theme: 'midnight', highContrastText: true });
    expect(colors.accentPurple).toBe('#3B82F6');
    expect(colors.textSecondary).toBe('#D6E0F0');
    expect(statusColor('In Progress')).toBe('#60A5FA');
    expect(priorityColor('none')).toBe(colors.textMuted);
  });
});

describe('focus highlight', () => {
  it('is off by default', () => {
    initTheme({ theme: 'dark', highContrastText: false });
    expect(focus.enabled).toBe(false);
    expect(focus.bg).toBe(DEFAULT_FOCUS_HIGHLIGHT_COLOR);
  });

  it('resolves a custom color and a readable text color', () => {
    initTheme({ theme: 'dark', highContrastText: false, focusHighlight: true, focusHighlightColor: 'fd0' });
    expect(focus).toEqual({ enabled: true, bg: '#FFDD00', fg: '#000000' });
  });

  it('falls back to the default color when the configured one is invalid', () => {
    initTheme({ theme: 'dark', highContrastText: false, focusHighlight: true, focusHighlightColor: 'purple' });
    expect(focus.bg).toBe(DEFAULT_FOCUS_HIGHLIGHT_COLOR);
  });

  it('offers 10 distinct presets that all meet WCAG AA text contrast', () => {
    expect(FOCUS_HIGHLIGHT_PRESETS).toHaveLength(10);
    expect(new Set(FOCUS_HIGHLIGHT_PRESETS.map(p => p.color)).size).toBe(10);
    for (const preset of FOCUS_HIGHLIGHT_PRESETS) {
      expect(parseHexColor(preset.color)).toBe(preset.color);
      expect(contrastRatio(preset.color, readableTextOn(preset.color))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('parses hex colors', () => {
    expect(parseHexColor('#1e90ff')).toBe('#1E90FF');
    expect(parseHexColor(' abc ')).toBe('#AABBCC');
    expect(parseHexColor('#12345')).toBeUndefined();
    expect(parseHexColor('')).toBeUndefined();
    expect(parseHexColor(undefined)).toBeUndefined();
  });
});
