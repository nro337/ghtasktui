import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cosmiconfig before importing config so loadConfig gets the mock
vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(),
}));

import { cosmiconfig } from 'cosmiconfig';
import { loadConfig, defaultConfig } from '../config.js';

const mockCosmiconfig = vi.mocked(cosmiconfig);

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a mock cosmiconfig explorer. */
function mockExplorer(result: { config: unknown; isEmpty?: boolean } | null) {
  return { search: vi.fn().mockResolvedValue(result) };
}

beforeEach(() => mockCosmiconfig.mockReset());

// ─── defaultConfig ────────────────────────────────────────────────────────────

describe('defaultConfig', () => {
  it('has expected general defaults', () => {
    expect(defaultConfig.general.defaultOwner).toBe('@me');
    expect(defaultConfig.general.defaultView).toBe('list');
    expect(defaultConfig.general.refreshInterval).toBe(0);
  });

  it('has expected appearance defaults', () => {
    expect(defaultConfig.appearance.nerdFonts).toBe(false);
    expect(defaultConfig.appearance.sidebarWidth).toBe(22);
    expect(defaultConfig.appearance.detailPanelRatio).toBe(0.4);
  });

  it('has empty keybindings and projects', () => {
    expect(defaultConfig.keybindings).toEqual({});
    expect(defaultConfig.projects).toEqual({});
  });
});

// ─── loadConfig — no config file ─────────────────────────────────────────────

describe('loadConfig — no config file found', () => {
  it('returns defaultConfig when search() returns null', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer(null) as unknown as ReturnType<typeof cosmiconfig>);
    const config = await loadConfig();
    expect(config).toEqual(defaultConfig);
  });

  it('returns defaultConfig when search() returns an empty result', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({ config: {}, isEmpty: true }) as unknown as ReturnType<typeof cosmiconfig>);
    const config = await loadConfig();
    expect(config).toEqual(defaultConfig);
  });
});

// ─── loadConfig — partial overrides ──────────────────────────────────────────

describe('loadConfig — partial config file', () => {
  it('merges a partial general section, preserving other defaults', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: { general: { defaultOwner: 'my-org' } },
    }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config.general.defaultOwner).toBe('my-org');
    expect(config.general.defaultView).toBe('list');
    expect(config.general.refreshInterval).toBe(0);
    expect(config.appearance).toEqual(defaultConfig.appearance);
  });

  it('merges a partial appearance section', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: { appearance: { nerdFonts: true } },
    }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config.appearance.nerdFonts).toBe(true);
    expect(config.appearance.sidebarWidth).toBe(defaultConfig.appearance.sidebarWidth);
    expect(config.general).toEqual(defaultConfig.general);
  });

  it('merges keybindings from config', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: { keybindings: { quit: 'x' } },
    }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config.keybindings).toEqual({ quit: 'x' });
  });

  it('merges projects from config', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: { projects: { 'acme/web': { defaultView: 'board' } } },
    }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config.projects['acme/web']).toEqual({ defaultView: 'board' });
  });

  it('treats missing sections as defaults', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: {},
    }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config).toEqual(defaultConfig);
  });
});

// ─── loadConfig — full override ───────────────────────────────────────────────

describe('loadConfig — full config file', () => {
  it('replaces all fields when all sections are provided', async () => {
    const full = {
      general: { defaultOwner: 'acme', defaultView: 'board' as const, refreshInterval: 60000 },
      appearance: { nerdFonts: true, sidebarWidth: 30, detailPanelRatio: 0.6 },
      keybindings: { quit: 'x', help: 'h' },
      projects: { 'acme/api': { defaultView: 'list' as const } },
    };
    mockCosmiconfig.mockReturnValue(mockExplorer({ config: full }) as unknown as ReturnType<typeof cosmiconfig>);

    const config = await loadConfig();
    expect(config.general).toEqual(full.general);
    expect(config.appearance).toEqual(full.appearance);
    expect(config.keybindings).toEqual(full.keybindings);
    expect(config.projects).toEqual(full.projects);
  });
});

// ─── loadConfig — does not mutate defaultConfig ───────────────────────────────

describe('loadConfig — isolation', () => {
  it('does not mutate defaultConfig when merging', async () => {
    mockCosmiconfig.mockReturnValue(mockExplorer({
      config: { general: { defaultOwner: 'acme' } },
    }) as unknown as ReturnType<typeof cosmiconfig>);

    await loadConfig();
    expect(defaultConfig.general.defaultOwner).toBe('@me');
  });
});
