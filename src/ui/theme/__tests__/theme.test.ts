import { describe, it, expect } from 'vitest';
import { initTheme, colors, statusColors, priorityColors } from '../theme.js';

describe('initTheme', () => {
  it('applies dark theme defaults', () => {
    initTheme({ theme: 'dark', highContrastText: false });
    expect(colors.accentPurple).toBe('#7C3AED');
    expect(colors.textSecondary).toBe('#8B8B8B');
  });

  it('applies midnight theme with strong text contrast', () => {
    initTheme({ theme: 'midnight', highContrastText: true });
    expect(colors.accentPurple).toBe('#3B82F6');
    expect(colors.textSecondary).toBe('#D4D4D4');
    expect(statusColors['in progress']).toBe('#60A5FA');
    expect(priorityColors.none).toBe(colors.textMuted);
  });
});
